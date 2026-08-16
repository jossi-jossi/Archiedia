import type { WebtoonMetadata } from '@archiedia/schema'
import { normalizeOverview } from './text'

// 데스크톱은 CORS 때문에 메인 프로세스 IPC를 거치지만, 네이티브 fetch에는 CORS가 없어서
// 여기서는 바로 호출한다. Referer는 없어도 API 자체는 응답하지만, 사이트와 같은 헤더를
// 보내 두는 편이 차단 위험이 적다.
const API_BASE = 'https://comic.naver.com/api'
export const NAVER_REFERER = 'https://comic.naver.com/'

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Referer: NAVER_REFERER } })
  if (!res.ok) throw new Error(`네이버웹툰 요청 실패 (${res.status})`)
  return (await res.json()) as T
}

interface NaverArtist {
  name: string
}

interface NaverCurationTag {
  tagName: string
  curationType: string
}

interface NaverGenre {
  description: string
}

function extractGenresAndTags(
  tagList: NaverCurationTag[] | undefined,
  genreList: NaverGenre[] | undefined
): { genres: string[]; tags: string[] } {
  const genres = genreList?.length
    ? genreList.map((g) => g.description)
    : (tagList ?? []).filter((t) => t.curationType.startsWith('GENRE_')).map((t) => t.tagName)

  const tags = (tagList ?? [])
    .filter(
      (t) => !t.curationType.startsWith('GENRE_') && !t.curationType.startsWith('FINISH_GENRE_')
    )
    .map((t) => t.tagName)

  return { genres: Array.from(new Set(genres)), tags: Array.from(new Set(tags)) }
}

export interface WebtoonSearchResult {
  id: number
  title: string
  author: string
  genres: string[]
  synopsis: string | null
  thumbnailUrl: string | null
}

interface NaverSearchViewItem {
  titleId: number
  titleName: string
  displayAuthor: string
  thumbnailUrl: string | null
  synopsis: string | null
  genreList?: NaverGenre[]
  tagList?: NaverCurationTag[]
}

interface NaverSearchResponse {
  searchWebtoonResult: {
    searchViewList: NaverSearchViewItem[]
  }
}

export async function searchWebtoons(keyword: string): Promise<WebtoonSearchResult[]> {
  const url = `${API_BASE}/search/all?keyword=${encodeURIComponent(keyword)}`
  const data = await request<NaverSearchResponse>(url)

  return (data.searchWebtoonResult?.searchViewList ?? []).map((item) => ({
    id: item.titleId,
    title: item.titleName,
    author: item.displayAuthor,
    genres: extractGenresAndTags(item.tagList, item.genreList).genres,
    synopsis: normalizeOverview(item.synopsis),
    thumbnailUrl: item.thumbnailUrl
  }))
}

interface NaverTitleInfoResponse {
  titleName: string
  thumbnailUrl: string | null
  communityArtists: NaverArtist[]
  synopsis: string | null
  finished: boolean
  curationTagList: NaverCurationTag[]
}

interface NaverArticleListResponse {
  totalCount: number
}

export interface WebtoonDetails {
  title: string
  posterUrl: string | null
  metadata: WebtoonMetadata
}

export async function getWebtoonDetails(titleId: number): Promise<WebtoonDetails> {
  const [info, articles] = await Promise.all([
    request<NaverTitleInfoResponse>(`${API_BASE}/article/list/info?titleId=${titleId}`),
    request<NaverArticleListResponse>(`${API_BASE}/article/list?titleId=${titleId}&page=1`)
  ])

  const { genres, tags } = extractGenresAndTags(info.curationTagList, undefined)

  return {
    title: info.titleName,
    posterUrl: info.thumbnailUrl,
    metadata: {
      author: info.communityArtists.map((a) => a.name).join(', ') || null,
      genres,
      tags,
      overview: normalizeOverview(info.synopsis),
      isFinished: info.finished,
      totalEpisodes: articles.totalCount ?? null,
      sourceUrl: `https://comic.naver.com/webtoon/list?titleId=${titleId}`,
      backgroundImageUrl: null,
      lastSyncedAt: new Date().toISOString()
    }
  }
}
