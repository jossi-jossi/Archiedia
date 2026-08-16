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
import { normalizeOverview } from '../../lib/text'

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
  source: 'naver' | 'kakao'
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
      source: input.source,
      external_id: input.externalId,
      poster_url: input.posterUrl,
      metadata: input.metadata,
      // 사용자 지정순에서 항상 맨 위에 오도록, 시간이 지날수록 더 작아지는 값을 준다.
      display_order: -Date.now()
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

export interface RefetchWebtoonInput {
  title: string
  posterUrl: string | null
  metadata: WebtoonMetadata
}

// 원본 사이트에서 최신 정보를 다시 받아와서 기존 항목의 title/posterUrl/metadata만 덮어쓴다.
// (외부 ID·소스·사용자 기록은 그대로 유지) 연재중 작품 자동 동기화에 쓰인다.
export async function refetchWebtoon(id: string, input: RefetchWebtoonInput): Promise<void> {
  const { error } = await supabase
    .from('content_items')
    .update({ title: input.title, poster_url: input.posterUrl, metadata: input.metadata })
    .eq('id', id)
  if (error) throw error
}

// 네이버/카카오 원문에 섞여 있던 강제 개행 문자(\n, U+2028 등) 때문에 모바일에서 줄거리가
// 엉뚱한 자리에서 끊겨 보이던 기존 저장 데이터를 한 번에 정리한다. 이미 정상인 항목은
// 비교만 하고 건드리지 않아 매번 라이브러리를 열 때 불러도 비용이 거의 없다.
export async function normalizeStoredWebtoonOverviews(
  items: WebtoonListItem[],
  onUpdated: (id: string, overview: string | null) => void
): Promise<void> {
  for (const { item } of items) {
    const normalized = normalizeOverview(item.metadata.overview)
    if (normalized === item.metadata.overview) continue
    try {
      const metadata = { ...item.metadata, overview: normalized }
      const { error } = await supabase.from('content_items').update({ metadata }).eq('id', item.id)
      if (error) throw error
      onUpdated(item.id, normalized)
    } catch {
      // 백그라운드 정리라 개별 실패는 조용히 넘어간다
    }
  }
}

export async function updateWebtoonDisplayOrder(id: string, displayOrder: number): Promise<void> {
  const { error } = await supabase
    .from('content_items')
    .update({ display_order: displayOrder })
    .eq('id', id)
  if (error) throw error
}

export async function deleteWebtoon(id: string): Promise<void> {
  // user_records.content_item_id는 on delete cascade라 같이 지워진다.
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw error
}

export async function getArchivedWebtoonIds(source: 'naver' | 'kakao'): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('content_items')
    .select('external_id')
    .eq('type', 'webtoon')
    .eq('source', source)
  if (error) throw error

  return new Set((data ?? []).map((row) => row.external_id as string).filter(Boolean))
}

export type { UserRecordPatch } from '../../lib/userRecords'
export { updateUserRecord } from '../../lib/userRecords'
