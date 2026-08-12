import {
  ContentItem,
  ContentItemRow,
  MovieMetadata,
  UserRecord,
  UserRecordRow,
  toContentItem,
  toUserRecord
} from '@archiedia/schema'
import { supabase } from '../../lib/supabase'

export type Movie = ContentItem & { type: 'movie' }

export interface MovieListItem {
  item: Movie
  record: UserRecord | null
}

export async function listMovies(): Promise<MovieListItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*, user_records(*)')
    .eq('type', 'movie')
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((row) => {
    const { user_records: userRecords, ...itemRow } = row as ContentItemRow & {
      user_records: UserRecordRow[]
    }
    return {
      item: toContentItem(itemRow) as Movie,
      record: userRecords?.[0] ? toUserRecord(userRecords[0]) : null
    }
  })
}

export async function getMovie(id: string): Promise<MovieListItem | null> {
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
    item: toContentItem(itemRow) as Movie,
    record: userRecords?.[0] ? toUserRecord(userRecords[0]) : null
  }
}

export interface CreateMovieInput {
  title: string
  posterUrl: string | null
  externalId: string
  metadata: MovieMetadata
}

export async function createMovie(input: CreateMovieInput): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('로그인이 필요합니다')

  const { data: itemRow, error: itemError } = await supabase
    .from('content_items')
    .insert({
      user_id: userId,
      type: 'movie',
      title: input.title,
      source: 'tmdb',
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
    watch_count: 0,
    tags: []
  })
  if (recordError) throw recordError

  return itemRow.id as string
}

export async function deleteMovie(id: string): Promise<void> {
  // user_records.content_item_id는 on delete cascade라 같이 지워진다.
  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw error
}

export async function getArchivedTmdbIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('content_items')
    .select('external_id')
    .eq('type', 'movie')
    .eq('source', 'tmdb')
  if (error) throw error

  return new Set((data ?? []).map((row) => row.external_id as string).filter(Boolean))
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
