export type ContentType = 'movie' | 'book' | 'webtoon' | 'drama'

export interface MovieMetadata {
  originalTitle: string | null
  releaseYear: number | null
  director: string | null
  genres: string[]
  actors: string[]
  runtimeMinutes: number | null
  country: string | null
  trailerUrl: string | null
  relatedContentItemIds: string[]
}

interface ContentItemBase {
  id: string
  userId: string
  source: string
  externalId: string | null
  title: string
  posterUrl: string | null
  createdAt: string
}

// 책/웹툰/드라마의 metadata 필드는 아직 미정 (ARCHITECTURE.md 7절 참고) — 확정되면 MovieMetadata처럼 구체 타입을 채운다.
export type ContentItem =
  | (ContentItemBase & { type: 'movie'; metadata: MovieMetadata })
  | (ContentItemBase & { type: 'book'; metadata: Record<string, unknown> })
  | (ContentItemBase & { type: 'webtoon'; metadata: Record<string, unknown> })
  | (ContentItemBase & { type: 'drama'; metadata: Record<string, unknown> })

export interface UserRecord {
  id: string
  userId: string
  contentItemId: string
  myRating: number | null
  myReview: string | null
  watchCount: number
  lastWatchedAt: string | null
  watchMedium: string | null
  tags: string[]
  updatedAt: string
}
