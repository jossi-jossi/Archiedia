import type { WebtoonMetadata } from '@archiedia/schema'

const API_BASE = 'https://gateway-kw.kakao.com'

function request<T>(url: string): Promise<T> {
  return window.api.webtoon.request(url) as Promise<T>
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

// 작가진(authors)에서 출판사(PUBLISHER)는 빼고 이름 순서대로 이어붙인다.
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
// 실제 사이트도 클라이언트에서 확장자를 붙여서 요청하는 것으로 보인다 (.webp로 확인됨).
function withImageExt(url: string | null): string | null {
  return url ? `${url}.webp` : null
}

export interface WebtoonSearchResult {
  id: number
  seoId: string
  title: string
  authors: string | null
  genre: string
  // 카카오웹툰 카드는 배경 삽화(backgroundImageUrl) 위에 캐릭터 이미지(posterUrl)를
  // 얹는 2겹 구조라 이미지 하나만으로는 재현이 안 된다.
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
  // featuredCharacterImageB(248×520)는 인물이 이미지 경계에서 잘린 타이트한 세로 크롭이라
  // 카드(480:623)에 넣으면 확대되거나 잘린 티가 난다. 인물 전체가 여백까지 온전히 들어간
  // featuredCharacterImageA(710×600)를 쓴다.
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
      overview: profile.data.synopsis?.trim() || null,
      isFinished: isFinished(profile.data.badges ?? []),
      totalEpisodes: episodes.meta.pagination.totalCount ?? null,
      sourceUrl: `https://webtoon.kakao.com/content/${result.seoId}/${result.id}`,
      backgroundImageUrl: result.backgroundImageUrl
    }
  }
}
