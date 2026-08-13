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
  overview: string | null
  relatedContentItemIds: string[]
}

// 감독/출연/줄거리/러닝타임/예고편은 시즌마다 달라질 수 있어서 시즌 단위로 따로 둔다.
export interface DramaSeasonMetadata {
  seasonNumber: number
  name: string
  overview: string | null
  episodeCount: number
  runtimeMinutes: number | null
  director: string | null
  actors: string[]
  trailerUrl: string | null
}

export interface DramaMetadata {
  originalTitle: string | null
  releaseYear: number | null
  genres: string[]
  country: string | null
  trailerUrl: string | null
  seasons: DramaSeasonMetadata[]
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

// 책/웹툰의 metadata 필드는 아직 미정 (ARCHITECTURE.md 7절 참고) — 확정되면 MovieMetadata처럼 구체 타입을 채운다.
export type ContentItem =
  | (ContentItemBase & { type: 'movie'; metadata: MovieMetadata })
  | (ContentItemBase & { type: 'book'; metadata: Record<string, unknown> })
  | (ContentItemBase & { type: 'webtoon'; metadata: Record<string, unknown> })
  | (ContentItemBase & { type: 'drama'; metadata: DramaMetadata })

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
