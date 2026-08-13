import { supabase } from './supabase'

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
