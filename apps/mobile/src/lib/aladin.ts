import type { BookMetadata } from '@archiedia/schema'
import { decodeHtmlEntities } from './htmlEntities'

// 데스크톱은 CORS 때문에 메인 프로세스 IPC를 거치지만 네이티브에서는 바로 호출한다.
// getContents.aspx는 Referer가 없으면 빈 응답을 주므로 헤더를 꼭 붙인다.
const API_BASE = 'https://www.aladin.co.kr/ttb/api'
const REFERER = 'https://www.aladin.co.kr/'

function ttbKey(): string {
  return process.env.EXPO_PUBLIC_ALADIN_TTB_KEY ?? ''
}

async function requestJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Referer: REFERER } })
  if (!res.ok) throw new Error(`알라딘 API 요청 실패 (${res.status})`)
  return (await res.json()) as T
}

async function requestText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Referer: REFERER } })
  if (!res.ok) throw new Error(`알라딘 요청 실패 (${res.status})`)
  return await res.text()
}

// Cover=Big으로 요청해도 cover200 경로라 화질이 떨어진다. CDN에 cover500이 실제로 존재한다.
function upscaleCover(url: string | null): string | null {
  if (!url) return null
  return url.replace(/\/cover\d+\//, '/cover500/')
}

export interface BookSearchResult {
  id: number
  title: string
  author: string
  publisher: string
  posterUrl: string | null
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

async function searchByTarget(
  keyword: string,
  target: 'Book' | 'Foreign'
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    ttbkey: ttbKey(),
    Query: keyword,
    QueryType: 'Keyword',
    SearchTarget: target,
    MaxResults: '20',
    Cover: 'Big',
    Output: 'JS',
    Version: '20131101'
  })

  const data = await requestJson<AladinSearchResponse>(`${API_BASE}/ItemSearch.aspx?${params}`)
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

// SearchTarget=Book은 국내도서만, Foreign은 원서만 검색돼서 둘을 합친다.
export async function searchBooks(keyword: string): Promise<BookSearchResult[]> {
  const [domestic, foreign] = await Promise.all([
    searchByTarget(keyword, 'Book'),
    searchByTarget(keyword, 'Foreign')
  ])
  return [...domestic, ...foreign]
}

// "호메로스 (지은이), 천병희 (옮긴이)"에서 지은이만 남기고 꼬리표를 뗀다.
export function authorNames(author: string | null): string | null {
  if (!author) return null

  const groups: { names: string[]; role: string | null }[] = []
  let pending: string[] = []
  for (const raw of author.split(',')) {
    const part = raw.trim()
    if (!part) continue
    const tagged = part.match(/^(.*?)\s*\(([^()]*)\)$/)
    if (tagged) {
      pending.push(tagged[1].trim())
      groups.push({ names: pending.filter(Boolean), role: tagged[2].trim() })
      pending = []
    } else {
      pending.push(part)
    }
  }
  if (pending.length > 0) groups.push({ names: pending, role: null })

  const authors = groups.filter((g) => g.role === null || g.role === '지은이')
  const picked = authors.length > 0 ? authors : groups.slice(0, 1)
  return picked.flatMap((g) => g.names).join(', ') || null
}

export function categoryOrigin(category: string | null): string | null {
  if (!category) return null
  return category.split('>')[0]?.trim() || null
}

const CATEGORY_ALIASES: Record<string, string> = {
  해외잡지: '잡지',
  '컴퓨터/모바일': '컴퓨터',
  '만화/라이트노벨': '만화',
  'ELT/어학/사전': '외국어'
}

const LANGUAGE_BUCKETS = new Set(['일본 도서', '중국 도서'])

const BUCKET_ALIASES: Record<string, string> = {
  일본잡지: '잡지',
  브랜드무크지: '잡지',
  '코믹/게임': '만화',
  엔터테인먼트: '예술/대중문화',
  '실용/취미/생활': '건강/취미'
}

// 알라딘 경로는 깊이가 3~5단계로 제각각이라 2단계(대분류) 기준으로 묶는다.
export function categoryGroup(category: string | null): string | null {
  if (!category) return null
  const segments = category
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return null

  let main = segments[1] ?? segments[0]
  if (LANGUAGE_BUCKETS.has(main) && segments[2]) {
    main = BUCKET_ALIASES[segments[2]] ?? segments[2]
  }
  return CATEGORY_ALIASES[main] ?? main
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

// API의 description/fullDescription은 축약돼 있거나(국내도서) 비어있어서(원서), 사이트가
// "책소개" 탭을 채울 때 쓰는 내부 조각-HTML 엔드포인트를 대신 읽는다.
async function fetchContentFragment(
  isbn: string,
  name: 'Introduce' | 'PublisherDesc'
): Promise<string> {
  const params = new URLSearchParams({ ISBN: isbn, name, type: '0', date: '15' })
  try {
    return await requestText(`https://www.aladin.co.kr/shop/product/getContents.aspx?${params}`)
  } catch {
    return ''
  }
}

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
  const params = new URLSearchParams({
    ttbkey: ttbKey(),
    ItemId: String(itemId),
    ItemIdType: 'ItemId',
    Cover: 'Big',
    Output: 'JS',
    Version: '20131101',
    OptResult: 'fullDescription'
  })

  const data = await requestJson<AladinLookupResponse>(`${API_BASE}/ItemLookUp.aspx?${params}`)
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
