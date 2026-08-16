import type { WebtoonMetadata } from '@archiedia/schema'
import { normalizeOverview } from './text'

const API_BASE = 'https://gateway-kw.kakao.com'
export const KAKAO_REFERER = 'https://webtoon.kakao.com/'

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Referer: KAKAO_REFERER } })
  if (!res.ok) throw new Error(`카카오웹툰 요청 실패 (${res.status})`)
  return (await res.json()) as T
}

interface KakaoAuthor {
  name: string
  type: string
  order: number
}

interface KakaoBadge {
  title: string
  type: string
}

// 작가진에서 출판사(PUBLISHER)는 빼고 이름 순서대로 이어붙인다.
function joinAuthors(authors: KakaoAuthor[]): string | null {
  const names = [...authors]
    .filter((a) => a.type !== 'PUBLISHER')
    .sort((a, b) => a.order - b.order)
    .map((a) => a.name)
  return Array.from(new Set(names)).join(', ') || null
}

function isFinished(badges: KakaoBadge[]): boolean {
  return badges.some((b) => b.type === 'STATUS' && b.title === 'COMPLETED')
}

// 카카오웹툰 CDN 이미지 URL은 확장자 없이 내려오는데, 확장자가 없으면 CDN이 404를 반환한다.
function withImageExt(url: string | null): string | null {
  return url ? `${url}.webp` : null
}

export interface WebtoonSearchResult {
  id: number
  seoId: string
  title: string
  authors: string | null
  genre: string
  posterUrl: string | null
  backgroundImageUrl: string | null
}

interface KakaoSearchItem {
  id: number
  seoId: string
  title: string
  genre: string
  searchCategory: string
  authors: KakaoAuthor[]
  featuredCharacterImageA: string | null
  backgroundImage: string | null
}

interface KakaoSearchResponse {
  data: {
    content: KakaoSearchItem[]
  }
}

export async function searchWebtoons(keyword: string): Promise<WebtoonSearchResult[]> {
  const url = `${API_BASE}/search/v2/content?limit=30&offset=0&word=${encodeURIComponent(keyword)}`
  const res = await request<KakaoSearchResponse>(url)

  return (res.data.content ?? [])
    .filter((item) => item.searchCategory === 'CONTENT')
    .map((item) => ({
      id: item.id,
      seoId: item.seoId,
      title: item.title,
      authors: joinAuthors(item.authors ?? []),
      genre: item.genre,
      posterUrl: withImageExt(item.featuredCharacterImageA),
      backgroundImageUrl: withImageExt(item.backgroundImage)
    }))
}

interface KakaoProfileResponse {
  data: {
    synopsis: string | null
    authors: KakaoAuthor[]
    seoKeywords: string[]
    badges: KakaoBadge[]
  }
}

interface KakaoEpisodeListResponse {
  meta: {
    pagination: {
      totalCount: number
    }
  }
}

export interface WebtoonDetails {
  title: string
  posterUrl: string | null
  metadata: WebtoonMetadata
}

export async function getWebtoonDetails(result: WebtoonSearchResult): Promise<WebtoonDetails> {
  const [profile, episodes] = await Promise.all([
    request<KakaoProfileResponse>(
      `${API_BASE}/decorator/v2/decorator/contents/${result.id}/profile`
    ),
    request<KakaoEpisodeListResponse>(
      `${API_BASE}/episode/v2/views/content-home/contents/${result.id}/episodes?sort=-NO&offset=0&limit=1`
    )
  ])

  return {
    title: result.title,
    posterUrl: result.posterUrl,
    metadata: {
      author: joinAuthors(profile.data.authors) ?? result.authors,
      genres: [result.genre],
      tags: profile.data.seoKeywords ?? [],
      overview: normalizeOverview(profile.data.synopsis),
      isFinished: isFinished(profile.data.badges ?? []),
      totalEpisodes: episodes.meta.pagination.totalCount ?? null,
      sourceUrl: `https://webtoon.kakao.com/content/${result.seoId}/${result.id}`,
      backgroundImageUrl: result.backgroundImageUrl,
      lastSyncedAt: new Date().toISOString()
    }
  }
}
