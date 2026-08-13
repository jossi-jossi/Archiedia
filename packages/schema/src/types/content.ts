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

// 시리즈(드라마) 상세페이지는 당분간 영화와 레이아웃을 그대로 공유해서, 필드 구성도 동일하게
// 맞춰뒀다. director는 TV쪽에선 크리에이터(created_by)로 채운다. 추후 시리즈 전용 레이아웃으로
// 바뀌면 이 타입도 함께 손볼 것.
export type DramaMetadata = MovieMetadata

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
