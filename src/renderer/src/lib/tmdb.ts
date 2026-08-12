import type { MovieMetadata } from '@archiedia/schema'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

function apiKey(): string {
  return import.meta.env.VITE_TMDB_API_KEY
}

export interface TmdbSearchResult {
  id: number
  title: string
  originalTitle: string
  year: number | null
  posterUrl: string | null
}

interface TmdbSearchResponse {
  results: {
    id: number
    title: string
    original_title: string
    release_date: string
    poster_path: string | null
  }[]
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = new URL(`${API_BASE}/search/movie`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('query', query)
  url.searchParams.set('language', 'ko-KR')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB 검색 실패 (${res.status})`)
  const data: TmdbSearchResponse = await res.json()

  return data.results.map((r) => ({
    id: r.id,
    title: r.title,
    originalTitle: r.original_title,
    year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    posterUrl: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : null
  }))
}

interface TmdbMovieDetail {
  title: string
  original_title: string
  release_date: string
  runtime: number | null
  poster_path: string | null
  genres: { name: string }[]
  production_countries: { iso_3166_1: string; name: string }[]
  credits: {
    crew: { job: string; name: string }[]
    cast: { name: string }[]
  }
  videos: {
    results: { site: string; type: string; key: string }[]
  }
}

export interface TmdbMovieDetails {
  title: string
  posterUrl: string | null
  metadata: MovieMetadata
}

function findTrailerKey(videos: { site: string; type: string; key: string }[]): string | null {
  return videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer')?.key ?? null
}

// TMDB의 production_countries.name은 language 파라미터와 무관하게 항상 영어라, 국가 코드를
// Intl.DisplayNames로 직접 한국어로 변환한다 (오프라인, 추가 API 호출 없음).
const koreanRegionNames = new Intl.DisplayNames(['ko'], { type: 'region' })

function toKoreanCountryName(iso3166: string | undefined, fallback: string | null): string | null {
  if (!iso3166) return fallback
  try {
    return koreanRegionNames.of(iso3166) ?? fallback
  } catch {
    return fallback
  }
}

// TMDB의 videos는 요청 language에 태깅된 영상만 돌려준다 (한국어 예고편이 없으면 빈 배열).
// 영어 예고편이 국적 상관없이 가장 커버리지가 넓어서, ko-KR에 없으면 en-US로 한 번 더 조회한다.
async function fetchFallbackTrailerKey(id: number): Promise<string | null> {
  const url = new URL(`${API_BASE}/movie/${id}/videos`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('language', 'en-US')

  const res = await fetch(url)
  if (!res.ok) return null
  const data: { results: { site: string; type: string; key: string }[] } = await res.json()
  return findTrailerKey(data.results)
}

export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  const url = new URL(`${API_BASE}/movie/${id}`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('language', 'ko-KR')
  url.searchParams.set('append_to_response', 'credits,videos')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB 상세 조회 실패 (${res.status})`)
  const data: TmdbMovieDetail = await res.json()

  const director = data.credits.crew.find((c) => c.job === 'Director')?.name ?? null
  const trailerKey = findTrailerKey(data.videos.results) ?? (await fetchFallbackTrailerKey(id))

  return {
    title: data.title,
    posterUrl: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : null,
    metadata: {
      originalTitle: data.original_title || null,
      releaseYear: data.release_date ? Number(data.release_date.slice(0, 4)) : null,
      director,
      genres: data.genres.map((g) => g.name),
      actors: data.credits.cast.slice(0, 5).map((c) => c.name),
      runtimeMinutes: data.runtime,
      country: toKoreanCountryName(
        data.production_countries[0]?.iso_3166_1,
        data.production_countries[0]?.name ?? null
      ),
      trailerUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null,
      relatedContentItemIds: []
    }
  }
}
