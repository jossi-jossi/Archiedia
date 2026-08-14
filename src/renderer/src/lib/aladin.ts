import type { BookMetadata } from '@archiedia/schema'

const API_BASE = 'http://www.aladin.co.kr/ttb/api'

function ttbKey(): string {
  return import.meta.env.VITE_ALADIN_TTB_KEY
}

function request<T>(url: string): Promise<T> {
  return window.api.aladin.request(url) as Promise<T>
}

export interface BookSearchResult {
  id: number
  title: string
  author: string
  publisher: string
  posterUrl: string | null
  // 전체 경로 문자열 (예: "국내도서>소설/시/희곡>한국소설").
  category: string | null
}

interface AladinSearchItem {
  itemId: number
  title: string
  author: string
  publisher: string
  cover: string
  categoryName: string
}

interface AladinSearchResponse {
  item?: AladinSearchItem[]
}

export async function searchBooks(keyword: string): Promise<BookSearchResult[]> {
  const url = new URL(`${API_BASE}/ItemSearch.aspx`)
  url.searchParams.set('ttbkey', ttbKey())
  url.searchParams.set('Query', keyword)
  url.searchParams.set('QueryType', 'Keyword')
  url.searchParams.set('SearchTarget', 'Book')
  url.searchParams.set('MaxResults', '20')
  url.searchParams.set('Cover', 'Big')
  url.searchParams.set('Output', 'JS')
  url.searchParams.set('Version', '20131101')

  const data = await request<AladinSearchResponse>(url.toString())
  return (data.item ?? []).map((it) => ({
    id: it.itemId,
    title: it.title,
    author: it.author,
    publisher: it.publisher,
    posterUrl: it.cover || null,
    category: it.categoryName || null
  }))
}

// 카드/검색결과처럼 좁은 자리에 쓸 짧은 카테고리명 — 전체 경로의 마지막 구간만 뽑는다.
export function shortCategory(category: string | null): string | null {
  if (!category) return null
  const segments = category.split('>')
  return segments.at(-1)?.trim() || null
}

interface AladinLookupItem {
  title: string
  author: string
  publisher: string
  pubDate: string
  cover: string
  description: string
  link: string
  subInfo?: {
    originalTitle?: string
    itemPage?: number
    fullDescription?: string
  }
  categoryIdList?: { categoryInfo: { categoryName: string } }[]
}

interface AladinLookupResponse {
  item?: AladinLookupItem[]
}

export interface BookDetails {
  title: string
  posterUrl: string | null
  metadata: BookMetadata
}

export async function getBookDetails(itemId: number): Promise<BookDetails> {
  const url = new URL(`${API_BASE}/ItemLookUp.aspx`)
  url.searchParams.set('ttbkey', ttbKey())
  url.searchParams.set('ItemId', String(itemId))
  url.searchParams.set('ItemIdType', 'ItemId')
  url.searchParams.set('Cover', 'Big')
  url.searchParams.set('Output', 'JS')
  url.searchParams.set('Version', '20131101')
  url.searchParams.set('OptResult', 'fullDescription,categoryIdList')

  const data = await request<AladinLookupResponse>(url.toString())
  const item = data.item?.[0]
  if (!item) throw new Error('알라딘에서 이 책 정보를 찾지 못했어요')

  // categoryIdList는 가장 구체적인 분류가 마지막 항목으로 온다(예: 국내도서 > 소설/시/희곡 > 한국소설).
  const category = item.categoryIdList?.at(-1)?.categoryInfo.categoryName ?? null

  return {
    title: item.title,
    posterUrl: item.cover || null,
    metadata: {
      author: item.author || null,
      originalTitle: item.subInfo?.originalTitle || null,
      publisher: item.publisher || null,
      releaseYear: item.pubDate ? Number(item.pubDate.slice(0, 4)) : null,
      pageCount: item.subInfo?.itemPage ?? null,
      category,
      overview: item.subInfo?.fullDescription?.trim() || item.description?.trim() || null,
      sourceUrl: item.link || null
    }
  }
}
