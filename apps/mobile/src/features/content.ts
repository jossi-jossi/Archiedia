import {
  ContentItem,
  ContentItemRow,
  ContentType,
  UserRecord,
  UserRecordRow,
  toContentItem,
  toUserRecord
} from '@archiedia/schema'
import { supabase } from '../lib/supabase'

// 데스크톱은 콘텐츠 종류마다 api.ts를 따로 두지만(화면도 종류별로 따로다), 모바일은 한
// 화면을 종류로 파라미터화하는 디자인이라 데이터 접근도 하나로 둔다.

export interface ContentListItem {
  item: ContentItem
  record: UserRecord | null
}

function splitRow(row: unknown): ContentListItem {
  const { user_records: userRecords, ...itemRow } = row as ContentItemRow & {
    user_records: UserRecordRow[]
  }
  return {
    item: toContentItem(itemRow),
    record: userRecords?.[0] ? toUserRecord(userRecords[0]) : null
  }
}

export async function listContent(type: ContentType): Promise<ContentListItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*, user_records(*)')
    .eq('type', type)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(splitRow)
}

export async function getContent(id: string): Promise<ContentListItem | null> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*, user_records(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return splitRow(data)
}

export interface CreateContentInput {
  type: ContentType
  source: string
  title: string
  posterUrl: string | null
  externalId: string
  metadata: unknown
}

export async function createContent(input: CreateContentInput): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('로그인이 필요합니다')

  const { data: itemRow, error: itemError } = await supabase
    .from('content_items')
    .insert({
      user_id: userId,
      type: input.type,
      title: input.title,
      source: input.source,
      external_id: input.externalId,
      poster_url: input.posterUrl,
      metadata: input.metadata,
      // 사용자 지정순에서 항상 맨 위에 오도록, 시간이 지날수록 더 작아지는 값을 준다.
      // (데스크톱과 동일한 규칙 — 순서 변경 자체는 데스크톱에서만 가능하다)
      display_order: -Date.now()
    })
    .select()
    .single()
  if (itemError) throw itemError

  const { error: recordError } = await supabase.from('user_records').insert({
    user_id: userId,
    content_item_id: itemRow.id,
    my_rating: null,
    my_review: null,
    watch_count: 0,
    last_watched_at: null,
    tags: []
  })
  if (recordError) throw recordError

  return itemRow.id as string
}

export interface UpdateContentInput {
  title?: string
  posterUrl?: string | null
  metadata: unknown
}

// 영화/시리즈의 감독·출연·줄거리, 책의 제목·표지·요약처럼 콘텐츠 자체의 정보를 사용자가
// 직접 고칠 때 쓴다. title/posterUrl은 넘길 때만 같이 바뀐다 — 책만 제목·표지를 고치고
// 나머지는 metadata만 바뀐다.
export async function updateContent(id: string, input: UpdateContentInput): Promise<void> {
  const patch: Record<string, unknown> = { metadata: input.metadata }
  if (input.title !== undefined) patch.title = input.title
  if (input.posterUrl !== undefined) patch.poster_url = input.posterUrl
  const { error } = await supabase.from('content_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteContent(id: string): Promise<void> {
  // user_records.content_item_id는 on delete cascade라 같이 지워진다.
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw error
}

// 검색 결과에 "보관 중"을 표시하려면 이미 저장된 외부 ID를 알아야 한다.
export async function getArchivedExternalIds(type: ContentType): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('content_items')
    .select('external_id')
    .eq('type', type)
  if (error) throw error
  return new Set((data ?? []).map((row) => row.external_id as string).filter(Boolean))
}

export async function countByType(type: ContentType): Promise<number> {
  const { count, error } = await supabase
    .from('content_items')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
  if (error) throw error
  return count ?? 0
}

export interface UserRecordPatch {
  myRating?: number | null
  myReview?: string | null
  watchCount?: number
  lastWatchedAt?: string | null
  watchMedium?: string | null
  tags?: string[]
}

export async function updateUserRecord(recordId: string, patch: UserRecordPatch): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if ('myRating' in patch) dbPatch.my_rating = patch.myRating
  if ('myReview' in patch) dbPatch.my_review = patch.myReview
  if ('watchCount' in patch) dbPatch.watch_count = patch.watchCount
  if ('lastWatchedAt' in patch) dbPatch.last_watched_at = patch.lastWatchedAt
  if ('watchMedium' in patch) dbPatch.watch_medium = patch.watchMedium
  if ('tags' in patch) dbPatch.tags = patch.tags

  const { error } = await supabase.from('user_records').update(dbPatch).eq('id', recordId)
  if (error) throw error
}
