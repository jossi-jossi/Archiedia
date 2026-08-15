import {
  ContentItem,
  ContentItemRow,
  DramaMetadata,
  UserRecord,
  UserRecordRow,
  toContentItem,
  toUserRecord
} from '@archiedia/schema'
import { supabase } from '../../lib/supabase'

export type Series = ContentItem & { type: 'drama' }

export interface SeriesListItem {
  item: Series
  record: UserRecord | null
}

export async function listSeries(): Promise<SeriesListItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*, user_records(*)')
    .eq('type', 'drama')
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((row) => {
    const { user_records: userRecords, ...itemRow } = row as ContentItemRow & {
      user_records: UserRecordRow[]
    }
    return {
      item: toContentItem(itemRow) as Series,
      record: userRecords?.[0] ? toUserRecord(userRecords[0]) : null
    }
  })
}

export async function getSeries(id: string): Promise<SeriesListItem | null> {
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
    item: toContentItem(itemRow) as Series,
    record: userRecords?.[0] ? toUserRecord(userRecords[0]) : null
  }
}

export interface CreateSeriesInput {
  title: string
  posterUrl: string | null
  externalId: string
  metadata: DramaMetadata
  initialRecord?: {
    myRating?: number | null
    myReview?: string | null
    watchCount?: number
    lastWatchedAt?: string | null
  }
}

export async function createSeries(input: CreateSeriesInput): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('로그인이 필요합니다')

  const { data: itemRow, error: itemError } = await supabase
    .from('content_items')
    .insert({
      user_id: userId,
      type: 'drama',
      title: input.title,
      source: 'tmdb',
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

export async function deleteSeries(id: string): Promise<void> {
  // user_records.content_item_id는 on delete cascade라 같이 지워진다.
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw error
}

export interface SeriesOverviewRef {
  id: string
  externalId: string
}

// 시즌별 줄거리(overview)가 비어있는 보관작 목록 — 시즌 단위 metadata 구조가 나중에
// 추가돼서, 그 전에 보관했거나 TMDB에 시즌 줄거리가 비어있던 항목은 값이 없다.
export async function getSeriesMissingOverview(): Promise<SeriesOverviewRef[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('id, external_id, metadata')
    .eq('type', 'drama')
    .eq('source', 'tmdb')
  if (error) throw error

  return (data ?? [])
    .filter((row) => {
      const seasons = (row.metadata as { seasons?: { overview?: string | null }[] })?.seasons
      return !seasons || seasons.length === 0 || seasons.some((s) => !s.overview)
    })
    .map((row) => ({ id: row.id as string, externalId: row.external_id as string }))
    .filter((ref) => ref.externalId)
}

export async function updateSeriesMetadata(
  id: string,
  metadata: DramaMetadata,
  posterUrl: string | null
): Promise<void> {
  const { error } = await supabase
    .from('content_items')
    .update({ metadata, poster_url: posterUrl })
    .eq('id', id)
  if (error) throw error
}

export async function updateSeriesDisplayOrder(id: string, displayOrder: number): Promise<void> {
  const { error } = await supabase
    .from('content_items')
    .update({ display_order: displayOrder })
    .eq('id', id)
  if (error) throw error
}

export async function getArchivedTmdbTvIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('content_items')
    .select('external_id')
    .eq('type', 'drama')
    .eq('source', 'tmdb')
  if (error) throw error

  return new Set((data ?? []).map((row) => row.external_id as string).filter(Boolean))
}

export type { UserRecordPatch } from '../../lib/userRecords'
export { updateUserRecord } from '../../lib/userRecords'
