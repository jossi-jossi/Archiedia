import type { BookMetadata } from '@archiedia/schema'

const API_BASE = 'https://www.aladin.co.kr/ttb/api'

function ttbKey(): string {
  return import.meta.env.VITE_ALADIN_TTB_KEY
}

function request<T>(url: string): Promise<T> {
  return window.api.aladin.request(url) as Promise<T>
}

// API가 주는 cover 이미지는 Cover=Big으로 요청해도 cover200(작은 썸네일) 경로라 화질이
// 떨어진다. CDN에 더 큰 cover500 경로가 실제로 존재해서(cover1000은 없음) URL을 바꿔치기한다.
function upscaleCover(url: string | null): string | null {
  if (!url) return null
  return url.replace(/\/cover\d+\//, '/cover500/')
}

// 알라딘 응답 텍스트(특히 책 소개)에 "&lt;이방인&gt;"처럼 <, > 등이 HTML 엔티티로 이스케이프돼
// 있는 경우가 있다. 화면에는 그냥 텍스트로 꽂아 넣으므로 미리 실제 문자로 되돌려둔다.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

export interface BookSearchResult {
  id: number
  title: string
  author: string
  publisher: string
  posterUrl: string | null
  // 전체 경로 문자열 (예: "국내도서>소설/시/희곡>한국소설").
  category: string | null
  isForeign: boolean
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

// SearchTarget=Book은 국내도서(번역서 포함)만, Foreign은 원서만 검색된다 — 하나로 합쳐서
// 검색어 하나로 둘 다 나오게 한다.
async function searchByTarget(
  keyword: string,
  target: 'Book' | 'Foreign'
): Promise<BookSearchResult[]> {
  const url = new URL(`${API_BASE}/ItemSearch.aspx`)
  url.searchParams.set('ttbkey', ttbKey())
  url.searchParams.set('Query', keyword)
  url.searchParams.set('QueryType', 'Keyword')
  url.searchParams.set('SearchTarget', target)
  url.searchParams.set('MaxResults', '20')
  url.searchParams.set('Cover', 'Big')
  url.searchParams.set('Output', 'JS')
  url.searchParams.set('Version', '20131101')

  const data = await request<AladinSearchResponse>(url.toString())
  return (data.item ?? []).map((it) => ({
    id: it.itemId,
    title: decodeHtmlEntities(it.title),
    author: decodeHtmlEntities(it.author),
    publisher: decodeHtmlEntities(it.publisher),
    posterUrl: upscaleCover(it.cover || null),
    category: it.categoryName ? decodeHtmlEntities(it.categoryName) : null,
    isForeign: target === 'Foreign'
  }))
}

export async function searchBooks(keyword: string): Promise<BookSearchResult[]> {
  const [domestic, foreign] = await Promise.all([
    searchByTarget(keyword, 'Book'),
    searchByTarget(keyword, 'Foreign')
  ])
  return [...domestic, ...foreign]
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
  categoryName: string
  isbn: string
  subInfo?: {
    originalTitle?: string
    itemPage?: number
    fullDescription?: string
  }
}

interface AladinLookupResponse {
  item?: AladinLookupItem[]
}

// ItemLookUp API의 description/fullDescription은 짧게 축약돼 있거나(국내도서) 아예 비어있는
// 경우가 많다(원서). 알라딘 상품페이지의 "책소개" 탭이 훨씬 자세한 내용을 담고 있는데, 이건
// API에 없고 사이트가 탭을 비동기로 채울 때 쓰는 내부 조각-HTML 엔드포인트로만 받을 수 있다.
// 국내도서는 보통 name=Introduce에 책소개가 있고, 원서는 그게 비어있는 대신 name=PublisherDesc에
// 있어서 순서대로 시도한다.
async function fetchContentFragment(
  isbn: string,
  name: 'Introduce' | 'PublisherDesc'
): Promise<string> {
  const url = new URL('https://www.aladin.co.kr/shop/product/getContents.aspx')
  url.searchParams.set('ISBN', isbn)
  url.searchParams.set('name', name)
  url.searchParams.set('type', '0')
  url.searchParams.set('date', '15')

  try {
    return await request<string>(url.toString())
  } catch {
    return ''
  }
}

// 조각 HTML은 서식 맞추려고 들여쓰기/줄바꿈이 잔뜩 섞여 있다. <br>/<p>만 실제 문단 구분으로
// 살리고, 나머지 태그와 소스 들여쓰기는 지운다.
function htmlFragmentToText(html: string): string {
  return html
    .replace(/<p\s*\/?>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchBookIntro(isbn: string): Promise<string | null> {
  if (!isbn) return null

  for (const name of ['Introduce', 'PublisherDesc'] as const) {
    const html = await fetchContentFragment(isbn, name)
    const match = html.match(
      /<div class="Ere_prod_mconts_R"[^>]*>([\s\S]*?)<div class="Ere_line2">/
    )
    const text = match?.[1] ? htmlFragmentToText(match[1]) : ''
    if (text) return decodeHtmlEntities(text)
  }
  return null
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
  url.searchParams.set('OptResult', 'fullDescription')

  const data = await request<AladinLookupResponse>(url.toString())
  const item = data.item?.[0]
  if (!item) throw new Error('알라딘에서 이 책 정보를 찾지 못했어요')

  const originalTitle = item.subInfo?.originalTitle?.replace(/\s*\(\d{4}년?\)\s*$/, '').trim()
  const apiOverview = (item.subInfo?.fullDescription?.trim() || item.description?.trim()) ?? null
  const overview = (await fetchBookIntro(item.isbn)) || apiOverview

  return {
    title: decodeHtmlEntities(item.title),
    posterUrl: upscaleCover(item.cover || null),
    metadata: {
      author: item.author ? decodeHtmlEntities(item.author) : null,
      // 알라딘 subInfo.originalTitle에는 종종 끝에 "(1919년)"처럼 출간연도가 괄호로
      // 붙어 있는데, 화면에는 원제만 보여준다.
      originalTitle: originalTitle ? decodeHtmlEntities(originalTitle) : null,
      publisher: item.publisher ? decodeHtmlEntities(item.publisher) : null,
      releaseYear: item.pubDate ? Number(item.pubDate.slice(0, 4)) : null,
      pageCount: item.subInfo?.itemPage ?? null,
      category: item.categoryName ? decodeHtmlEntities(item.categoryName) : null,
      overview: overview ? decodeHtmlEntities(overview) : null,
      sourceUrl: item.link || null
    }
  }
}
