import type { DramaMetadata, DramaSeasonMetadata, MovieMetadata } from '@archiedia/schema'

// 데스크톱(src/renderer/src/lib/tmdb.ts)과 같은 로직. 다른 점은 API 키를 읽는 방식뿐이다.
const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

function apiKey(): string {
  return process.env.EXPO_PUBLIC_TMDB_API_KEY ?? ''
}

export interface TmdbSearchResult {
  id: number
  title: string
  originalTitle: string
  year: number | null
  genres: string[]
  posterUrl: string | null
}

interface TmdbSearchResponse {
  results: {
    id: number
    title: string
    original_title: string
    release_date: string
    genre_ids: number[]
    poster_path: string | null
  }[]
}

const genreMapCache: Partial<Record<'movie' | 'tv', Promise<Record<number, string>>>> = {}

function loadGenreMap(kind: 'movie' | 'tv'): Promise<Record<number, string>> {
  const cached = genreMapCache[kind]
  if (cached) return cached

  const url = `${API_BASE}/genre/${kind}/list?api_key=${apiKey()}&language=ko-KR`
  const pending = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`TMDB 장르 목록 요청 실패 (${res.status})`)
    const data: { genres: { id: number; name: string }[] } = await res.json()
    return Object.fromEntries(data.genres.map((g) => [g.id, g.name]))
  })
  pending.catch(() => delete genreMapCache[kind])
  genreMapCache[kind] = pending
  return pending
}

function namesForIds(ids: number[] | undefined, map: Record<number, string>): string[] {
  return (ids ?? []).map((id) => map[id]).filter((name): name is string => Boolean(name))
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = `${API_BASE}/search/movie?api_key=${apiKey()}&language=ko-KR&query=${encodeURIComponent(query)}`
  const [res, genreMap] = await Promise.all([fetch(url), loadGenreMap('movie')])
  if (!res.ok) throw new Error(`TMDB 검색 실패 (${res.status})`)
  const data: TmdbSearchResponse = await res.json()

  return data.results.map((r) => ({
    id: r.id,
    title: r.title,
    originalTitle: r.original_title,
    year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    genres: namesForIds(r.genre_ids, genreMap),
    posterUrl: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : null
  }))
}

interface TmdbMovieDetail {
  title: string
  original_title: string
  release_date: string
  runtime: number | null
  poster_path: string | null
  overview: string
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

// TMDB의 production_countries.name은 language와 무관하게 항상 영어다. 데스크톱은
// Intl.DisplayNames로 한글화하는데, RN의 Hermes는 Intl 지원이 빌드에 따라 다르므로
// 먼저 Intl을 시도하고 안 되면 표에서 찾는다.
const COUNTRY_NAMES: Record<string, string> = {
  KR: '한국',
  US: '미국',
  JP: '일본',
  CN: '중국',
  GB: '영국',
  FR: '프랑스',
  DE: '독일',
  IT: '이탈리아',
  ES: '스페인',
  CA: '캐나다',
  AU: '호주',
  IN: '인도',
  TW: '대만',
  HK: '홍콩',
  TH: '태국'
}

function toKoreanCountryName(iso3166: string | undefined, fallback: string | null): string | null {
  if (!iso3166) return fallback
  try {
    const names = new Intl.DisplayNames(['ko'], { type: 'region' })
    const resolved = names.of(iso3166)
    if (resolved && resolved !== iso3166) return resolved
  } catch {
    // Intl.DisplayNames가 없는 런타임 — 아래 표로 처리
  }
  return COUNTRY_NAMES[iso3166] ?? fallback
}

// TMDB의 videos는 요청 language에 태깅된 영상만 돌려준다 (한국어 예고편이 없으면 빈 배열).
// 영어 예고편이 커버리지가 가장 넓어서, ko-KR에 없으면 en-US로 한 번 더 조회한다.
async function fetchFallbackTrailerKey(path: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/${path}/videos?api_key=${apiKey()}&language=en-US`)
  if (!res.ok) return null
  const data: { results: { site: string; type: string; key: string }[] } = await res.json()
  return findTrailerKey(data.results)
}

export async function getMovieDetails(id: number): Promise<TmdbMovieDetails> {
  const url = `${API_BASE}/movie/${id}?api_key=${apiKey()}&language=ko-KR&append_to_response=credits,videos`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB 상세 조회 실패 (${res.status})`)
  const data: TmdbMovieDetail = await res.json()

  const trailerKey =
    findTrailerKey(data.videos.results) ?? (await fetchFallbackTrailerKey(`movie/${id}`))

  return {
    title: data.title,
    posterUrl: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : null,
    metadata: {
      originalTitle: data.original_title || null,
      releaseYear: data.release_date ? Number(data.release_date.slice(0, 4)) : null,
      director: data.credits.crew.find((c) => c.job === 'Director')?.name ?? null,
      genres: data.genres.map((g) => g.name),
      actors: data.credits.cast.slice(0, 5).map((c) => c.name),
      runtimeMinutes: data.runtime,
      country: toKoreanCountryName(
        data.production_countries[0]?.iso_3166_1,
        data.production_countries[0]?.name ?? null
      ),
      trailerUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null,
      overview: data.overview || null,
      relatedContentItemIds: []
    }
  }
}

interface TmdbTvSearchResponse {
  results: {
    id: number
    name: string
    original_name: string
    first_air_date: string
    genre_ids: number[]
    poster_path: string | null
  }[]
}

export async function searchTv(query: string): Promise<TmdbSearchResult[]> {
  const url = `${API_BASE}/search/tv?api_key=${apiKey()}&language=ko-KR&query=${encodeURIComponent(query)}`
  const [res, genreMap] = await Promise.all([fetch(url), loadGenreMap('tv')])
  if (!res.ok) throw new Error(`TMDB 검색 실패 (${res.status})`)
  const data: TmdbTvSearchResponse = await res.json()

  return data.results.map((r) => ({
    id: r.id,
    title: r.name,
    originalTitle: r.original_name,
    year: r.first_air_date ? Number(r.first_air_date.slice(0, 4)) : null,
    genres: translateTvGenres(namesForIds(r.genre_ids, genreMap)),
    posterUrl: r.poster_path ? `${IMAGE_BASE}${r.poster_path}` : null
  }))
}

interface TmdbTvDetail {
  name: string
  original_name: string
  first_air_date: string
  poster_path: string | null
  overview: string
  genres: { name: string }[]
  production_countries: { iso_3166_1: string; name: string }[]
  seasons: { season_number: number }[]
  created_by: { name: string }[]
  videos: {
    results: { site: string; type: string; key: string }[]
  }
}

interface TmdbSeasonDetail {
  season_number: number
  name: string
  overview: string
  episodes: { runtime: number | null }[]
  credits: {
    cast: { name: string }[]
    crew: { job: string; name: string }[]
  }
  videos: {
    results: { site: string; type: string; key: string }[]
  }
}

// TMDB의 TV 장르는 ko-KR로도 번역이 안 되고 영문 그대로 오는 경우가 있다.
const TV_GENRE_TRANSLATIONS: Record<string, string[]> = {
  'Action & Adventure': ['액션', '모험'],
  Kids: ['아동'],
  News: ['뉴스'],
  Reality: ['리얼리티'],
  'Sci-Fi & Fantasy': ['SF', '판타지'],
  Soap: ['연속극'],
  Talk: ['토크쇼'],
  'War & Politics': ['전쟁', '정치']
}

function translateTvGenres(names: string[]): string[] {
  return names.flatMap((name) => TV_GENRE_TRANSLATIONS[name] ?? [name])
}

async function getSeasonDetail(
  tvId: number,
  seasonNumber: number,
  fallbackTrailerUrl: string | null,
  fallbackDirector: string | null,
  fallbackOverview: string | null
): Promise<DramaSeasonMetadata> {
  const url = `${API_BASE}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey()}&language=ko-KR&append_to_response=credits,videos`
  const res = await fetch(url)
  if (!res.ok) {
    return {
      seasonNumber,
      name: `시즌 ${seasonNumber}`,
      overview: fallbackOverview,
      episodeCount: 0,
      runtimeMinutes: null,
      director: fallbackDirector,
      actors: [],
      trailerUrl: fallbackTrailerUrl
    }
  }
  const data: TmdbSeasonDetail = await res.json()

  const runtimes = data.episodes
    .map((e) => e.runtime)
    .filter((r): r is number => typeof r === 'number' && r > 0)
  const runtimeMinutes = runtimes.length
    ? Math.round(runtimes.reduce((sum, r) => sum + r, 0) / runtimes.length)
    : null
  const director =
    Array.from(
      new Set(data.credits.crew.filter((c) => c.job === 'Director').map((c) => c.name))
    ).join(', ') ||
    fallbackDirector ||
    null
  const trailerKey =
    findTrailerKey(data.videos.results) ??
    (await fetchFallbackTrailerKey(`tv/${tvId}/season/${seasonNumber}`))
  const trailerUrl = trailerKey
    ? `https://www.youtube.com/watch?v=${trailerKey}`
    : fallbackTrailerUrl

  return {
    seasonNumber: data.season_number,
    name: data.name,
    overview: data.overview || fallbackOverview,
    episodeCount: data.episodes.length,
    runtimeMinutes,
    director,
    actors: data.credits.cast.slice(0, 5).map((c) => c.name),
    trailerUrl
  }
}

export interface TmdbTvDetails {
  title: string
  posterUrl: string | null
  metadata: DramaMetadata
}

export async function getTvDetails(id: number): Promise<TmdbTvDetails> {
  const url = `${API_BASE}/tv/${id}?api_key=${apiKey()}&language=ko-KR&append_to_response=videos`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB 상세 조회 실패 (${res.status})`)
  const data: TmdbTvDetail = await res.json()

  const trailerKey =
    findTrailerKey(data.videos.results) ?? (await fetchFallbackTrailerKey(`tv/${id}`))
  const showTrailerUrl = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null
  const showDirector = data.created_by.map((c) => c.name).join(', ') || null
  const showOverview = data.overview || null

  // season_number 0은 "스페셜"이라 정규 시즌 목록/개수에서 제외한다.
  const seasonNumbers = data.seasons
    .map((s) => s.season_number)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  const seasons = await Promise.all(
    seasonNumbers.map((n) => getSeasonDetail(id, n, showTrailerUrl, showDirector, showOverview))
  )

  return {
    title: data.name,
    posterUrl: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : null,
    metadata: {
      originalTitle: data.original_name || null,
      releaseYear: data.first_air_date ? Number(data.first_air_date.slice(0, 4)) : null,
      genres: translateTvGenres(data.genres.map((g) => g.name)),
      country: toKoreanCountryName(
        data.production_countries[0]?.iso_3166_1,
        data.production_countries[0]?.name ?? null
      ),
      trailerUrl: showTrailerUrl,
      seasons,
      relatedContentItemIds: []
    }
  }
}
