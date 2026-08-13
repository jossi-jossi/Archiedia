import type { WebtoonMetadata } from '@archiedia/schema'

const API_BASE = 'https://comic.naver.com/api'

function request<T>(url: string): Promise<T> {
  return window.api.naverWebtoon.request(url) as Promise<T>
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

// 장르 태그(curationType이 GENRE_로 시작)와 순수 해시태그(CUSTOM_TAG)를 구분해서 뽑는다.
function extractGenresAndTags(
  tagList: NaverCurationTag[] | undefined,
  genreList: NaverGenre[] | undefined
): { genres: string[]; tags: string[] } {
  const genres = genreList?.length
    ? genreList.map((g) => g.description)
    : (tagList ?? []).filter((t) => t.curationType.startsWith('GENRE_')).map((t) => t.tagName)

  const tags = (tagList ?? []).filter((t) => t.curationType === 'CUSTOM_TAG').map((t) => t.tagName)

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
    synopsis: item.synopsis?.trim() || null,
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
      overview: info.synopsis?.trim() || null,
      isFinished: info.finished,
      totalEpisodes: articles.totalCount ?? null,
      sourceUrl: `https://comic.naver.com/webtoon/list?titleId=${titleId}`
    }
  }
}
