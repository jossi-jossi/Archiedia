import {
  ContentItem,
  ContentItemRow,
  UserRecord,
  UserRecordRow,
  WebtoonMetadata,
  toContentItem,
  toUserRecord
} from '@archiedia/schema'
import { supabase } from '../../lib/supabase'

export type Webtoon = ContentItem & { type: 'webtoon' }

export interface WebtoonListItem {
  item: Webtoon
  record: UserRecord | null
}

export async function listWebtoons(): Promise<WebtoonListItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*, user_records(*)')
    .eq('type', 'webtoon')
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((row) => {
    const { user_records: userRecords, ...itemRow } = row as ContentItemRow & {
      user_records: UserRecordRow[]
    }
    return {
      item: toContentItem(itemRow) as Webtoon,
      record: userRecords?.[0] ? toUserRecord(userRecords[0]) : null
    }
  })
}

export async function getWebtoon(id: string): Promise<WebtoonListItem | null> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*, user_records(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const { user_records: userRecords, ...itemRow } = data as ContentItemRow & {
    user_records: UserRecordRow[]
  }
  return {
    item: toContentItem(itemRow) as Webtoon,
    record: userRecords?.[0] ? toUserRecord(userRecords[0]) : null
  }
}

export interface CreateWebtoonInput {
  title: string
  posterUrl: string | null
  externalId: string
  metadata: WebtoonMetadata
  initialRecord?: {
    myRating?: number | null
    myReview?: string | null
    watchCount?: number
    lastWatchedAt?: string | null
  }
}

export async function createWebtoon(input: CreateWebtoonInput): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('로그인이 필요합니다')

  const { data: itemRow, error: itemError } = await supabase
    .from('content_items')
    .insert({
      user_id: userId,
      type: 'webtoon',
      title: input.title,
      source: 'naver',
      external_id: input.externalId,
      poster_url: input.posterUrl,
      metadata: input.metadata
    })
    .select()
    .single()
  if (itemError) throw itemError

  const { error: recordError } = await supabase.from('user_records').insert({
    user_id: userId,
    content_item_id: itemRow.id,
    my_rating: input.initialRecord?.myRating ?? null,
    my_review: input.initialRecord?.myReview ?? null,
    watch_count: input.initialRecord?.watchCount ?? 0,
    last_watched_at: input.initialRecord?.lastWatchedAt ?? null,
    tags: []
  })
  if (recordError) throw recordError

  return itemRow.id as string
}

export async function deleteWebtoon(id: string): Promise<void> {
  // user_records.content_item_id는 on delete cascade라 같이 지워진다.
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw error
}

export async function getArchivedNaverWebtoonIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('content_items')
    .select('external_id')
    .eq('type', 'webtoon')
    .eq('source', 'naver')
  if (error) throw error

  return new Set((data ?? []).map((row) => row.external_id as string).filter(Boolean))
}

export type { UserRecordPatch } from '../../lib/userRecords'
export { updateUserRecord } from '../../lib/userRecords'
