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

export interface WebtoonMetadata {
  author: string | null
  genres: string[]
  tags: string[]
  overview: string | null
  isFinished: boolean
  totalEpisodes: number | null
  sourceUrl: string | null
  // 카카오웹툰은 완성된 포스터 이미지 한 장이 아니라, 배경 삽화(backgroundImageUrl) 위에
  // 캐릭터 컷아웃(posterUrl)을 얹는 2겹 카드 구조라 배경 이미지를 따로 저장해서 합성
  // 렌더링한다. 네이버는 항상 null.
  backgroundImageUrl: string | null
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

// 책의 metadata 필드는 아직 미정 (ARCHITECTURE.md 7절 참고) — 확정되면 MovieMetadata처럼 구체 타입을 채운다.
export type ContentItem =
  | (ContentItemBase & { type: 'movie'; metadata: MovieMetadata })
  | (ContentItemBase & { type: 'book'; metadata: Record<string, unknown> })
  | (ContentItemBase & { type: 'webtoon'; metadata: WebtoonMetadata })
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
