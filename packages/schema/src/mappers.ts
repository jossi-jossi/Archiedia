import { ContentItemRow, UserRecordRow } from './types/database'
import { ContentItem, UserRecord } from './types/content'

export function toContentItem(row: ContentItemRow): ContentItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as ContentItem['type'],
    source: row.source,
    externalId: row.external_id,
    title: row.title,
    posterUrl: row.poster_url,
    createdAt: row.created_at,
    metadata: row.metadata
  } as unknown as ContentItem
}

export function toUserRecord(row: UserRecordRow): UserRecord {
  return {
    id: row.id,
    userId: row.user_id,
    contentItemId: row.content_item_id,
    myRating: row.my_rating,
    myReview: row.my_review,
    watchCount: row.watch_count,
    lastWatchedAt: row.last_watched_at,
    watchMedium: row.watch_medium,
    tags: row.tags,
    updatedAt: row.updated_at
  }
}
