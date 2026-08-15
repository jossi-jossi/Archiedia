import {
  ArrowsDownUp,
  Eye,
  Heart,
  ListBullets,
  MagnifyingGlass,
  SquaresFour,
  Star
} from '@phosphor-icons/react'
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  listBooks,
  updateBookDisplayOrder,
  updateBookInfo,
  updateUserRecord,
  BookListItem
} from './api'
import { errorMessage } from '../../lib/errors'
import { authorNames, categoryGroup, categoryOrigin, stripSoleAuthorTag } from '../../lib/aladin'
import { FilterDropdown } from '../../components/FilterDropdown'
import { displayTag, isWatching, isWishlisted, withoutStatusTags } from '../../lib/wishlist'
import { computeDisplayOrderForInsert, MISSING_ORDER } from '../../lib/reorder'

interface Props {
  onSelect: (id: string) => void
  onCountChange: (count: number) => void
  refreshKey: number
}

type SortKey =
  | 'custom'
  | 'added_desc'
  | 'added_asc'
  | 'rating_desc'
  | 'rating_asc'
  | 'watched_desc'
  | 'watch_count_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'custom', label: '사용자 지정순' },
  { value: 'added_desc', label: '보관 최신순' },
  { value: 'added_asc', label: '보관 오래된순' },
  { value: 'rating_desc', label: '나의 평점 높은순' },
  { value: 'rating_asc', label: '나의 평점 낮은순' },
  { value: 'watched_desc', label: '최근 읽은순' },
  { value: 'watch_count_desc', label: '읽은 횟수 높은순' }
]

function StarRating({ rating }: { rating: number | null }): React.JSX.Element {
  const value = rating ?? 0
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <div key={i} style={{ position: 'relative', width: 12, height: 12 }}>
            <Star
              size={12}
              weight="fill"
              color="var(--color-neutral-700)"
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: 12,
                overflow: 'hidden',
                width: fill * 12
              }}
            >
              <Star
                size={12}
                weight="fill"
                color="var(--color-accent)"
                style={{ position: 'absolute', top: 0, left: 0 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 그리드 카드·목록 표에서 쓰는 아이콘 전용 상태 버튼(보고 싶어요/보는 중 공용).
function StatusIconButton({
  icon: Icon,
  active,
  onClick
}: {
  icon: React.ComponentType<{ size?: number; weight?: 'regular' | 'fill'; color?: string }>
  active: boolean
  onClick: (e: React.MouseEvent) => void
}): React.JSX.Element {
  return (
    <button type="button" className="btn btn-ghost" style={{ padding: 4 }} onClick={onClick}>
      <Icon size={14} weight={active ? 'fill' : 'regular'} color={active ? undefined : '#fff'} />
    </button>
  )
}

// 도서 표지 업계 표준 비율(2:3) — 영화 포스터와 동일하다.
const poster = (url: string | null): React.CSSProperties => ({
  aspectRatio: '2 / 3',
  borderRadius: 'var(--radius-md)',
  position: 'relative',
  overflow: 'hidden',
  background: url
    ? `center / cover no-repeat url(${url})`
    : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)'
})

// 알라딘이 자동으로 채워준 표지는 항상 이 경로 패턴(cover500 등)을 갖는다. 사용자가
// 정보 수정 팝업에서 표지 URL을 직접 바꾸면 이 패턴을 벗어나므로, 그 여부로 "직접 바꾼
// 표지인지"를 구분한다.
function isManualPosterUrl(url: string | null): boolean {
  return Boolean(url) && !/\/cover\d+\//.test(url as string)
}

// 사용자가 직접 붙여넣은 표지는 원본 해상도를 알 수 없어서, 그리드 카드에 CSS로 그대로
// 욱여넣으면 세밀한 이미지일 때 다운스케일 아티팩트(뭉개짐/모아레)가 생기기 쉽다. canvas에
// 카드 크기 그대로 그려서(imageSmoothingQuality: 'high') CSS background-size:cover보다
// 나은 품질로 미리 축소해 보여준다.
//
// canvas 해상도는 목표 크기(150px)를 고정값으로 가정하지 않고, ResizeObserver로 실제
// 렌더링된 카드 크기를 그대로 읽어서 맞춘다 — 고정값을 쓰면 실제 카드 폭이 그 값과 달라질
// 때(창 크기에 따라 열 수·카드 폭이 바뀌므로) 브라우저가 이미 그린 canvas 결과물을 또
// 한 번 늘리거나 줄이게 되어, 멀쩡한 이미지까지 다시 뭉개지는 이중 스케일링이 생긴다.
function CanvasPoster({ url }: { url: string }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const img = new Image()

    function draw(): void {
      const ctx = canvas!.getContext('2d')
      if (!ctx || !img.complete || img.naturalWidth === 0) return
      const width = canvas!.clientWidth
      const height = canvas!.clientHeight
      if (width === 0 || height === 0) return
      const dpr = window.devicePixelRatio || 1
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight)
      const drawWidth = img.naturalWidth * scale
      const drawHeight = img.naturalHeight * scale
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
    }

    img.onload = draw
    img.src = url

    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [url])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        aspectRatio: '2 / 3',
        borderRadius: 'var(--radius-md)',
        display: 'block'
      }}
    />
  )
}

function parseWatchedAt(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function unique(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort()
}

// 목록 표의 한 행. 순서 변경 모드일 때만 dnd-kit의 정렬 드래그가 걸린다 — 다른 행이
// 드래그 중일 때도 transform으로 부드럽게 밀려나는 자리 이동이 자동으로 계산된다.
function BookRow({
  item,
  record,
  reorderMode,
  onSelect,
  toggleStatus
}: {
  item: BookListItem['item']
  record: BookListItem['record']
  reorderMode: boolean
  onSelect: (id: string) => void
  toggleStatus: (
    itemId: string,
    record: NonNullable<BookListItem['record']>,
    tag: '보고 싶음' | '보는 중',
    active: boolean
  ) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !reorderMode
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: reorderMode ? 'grab' : 'pointer',
    position: 'relative',
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0.6 : 1,
    background: isDragging ? 'var(--color-surface)' : undefined
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={reorderMode ? undefined : () => onSelect(item.id)}
      {...(reorderMode ? attributes : {})}
      {...(reorderMode ? listeners : {})}
    >
      <td style={{ width: 40 }}>
        <div
          style={{
            width: 32,
            height: 48,
            borderRadius: 4,
            margin: '0 auto',
            ...poster(item.posterUrl),
            aspectRatio: undefined
          }}
        />
      </td>
      <td>
        <div
          title={item.title}
          style={{
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>
          {authorNames(item.metadata.author) ?? '—'}
        </div>
      </td>
      <td
        style={{
          color: 'var(--color-neutral-400)',
          maxWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={item.metadata.category ?? undefined}
      >
        {categoryGroup(item.metadata.category) ?? '—'}
      </td>
      <td style={{ color: 'var(--color-neutral-400)', padding: 0 }}>
        <span style={{ marginLeft: -6, display: 'inline-block' }}>
          {item.metadata.pageCount ? `${item.metadata.pageCount}쪽` : '—'}
        </span>
      </td>
      <td>
        <StarRating rating={record?.myRating ?? null} />
      </td>
      <td>
        {record?.tags.map((tag) => (
          <span key={tag} className="tag tag-neutral" style={{ marginRight: 4 }}>
            {displayTag(tag)}
          </span>
        )) || '—'}
      </td>
      <td style={{ color: 'var(--color-neutral-500)' }}>{record?.lastWatchedAt ?? '—'}</td>
      <td>
        {record && (
          <StatusIconButton
            icon={Heart}
            active={isWishlisted(record.tags)}
            onClick={(e) => {
              e.stopPropagation()
              toggleStatus(item.id, record, '보고 싶음', isWishlisted(record.tags))
            }}
          />
        )}
      </td>
      <td>
        {record && (
          <StatusIconButton
            icon={Eye}
            active={isWatching(record.tags)}
            onClick={(e) => {
              e.stopPropagation()
              toggleStatus(item.id, record, '보는 중', isWatching(record.tags))
            }}
          />
        )}
      </td>
    </tr>
  )
}

const SHOW_FILTERS = true

// 알라딘 카테고리 경로의 맨 앞 구간과 그대로 일치해야 한다.
const ORIGINS = ['국내도서', '외국도서']

const POSTER_WIDTH = 150
const GRID_GAP = 18
// 헤더 행(제목/검색/토글, 필터/정렬)의 오른쪽 여백과 같은 값. 마지막 카드가 여기 맞춰진다.
const HEADER_RIGHT_MARGIN = 28

const VIEW_KEY = 'archiedia:bookLibraryView'

function loadView(): 'grid' | 'list' {
  return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
}

// 컨테이너 폭을 실측해서 POSTER_WIDTH를 "목표 크기"로 삼아 정확히 들어가는 열 수를 계산한다.
// auto-fill + 고정폭 방식은 열이 하나 늘어나기 직전 스크롤바 앞에 카드 한 칸만큼의 공백이 생기는데,
// 열 수를 직접 계산해 1fr로 분배하면 그 공백이 카드 사이로 흩어져 사라진다.
//
// gutter는 스크롤바 실제 폭(el.offsetWidth - el.clientWidth로 측정)을 감안해서
// (HEADER_RIGHT_MARGIN - 스크롤바폭) / 2로 계산한다. 이 값을 스크롤 컨테이너 자신의
// paddingRight와 안쪽 그리드의 paddingRight에 똑같이 적용하면, 스크롤바가 그 두 여백
// 사이 — 즉 HEADER_RIGHT_MARGIN 폭 안의 정중앙 — 에 위치하게 되고, 카드 오른쪽 끝은
// 정확히 헤더의 오른쪽 경계(HEADER_RIGHT_MARGIN)에 맞춰진다.
function useGridColumns(
  targetWidth: number
): [React.RefObject<HTMLDivElement | null>, number, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)
  const [gutter, setGutter] = useState(HEADER_RIGHT_MARGIN / 2)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function recompute(): void {
      const scrollbarWidth = el!.offsetWidth - el!.clientWidth
      const nextGutter = Math.max(0, Math.round((HEADER_RIGHT_MARGIN - scrollbarWidth) / 2))
      setGutter(nextGutter)

      const width = el!.clientWidth - nextGutter
      setColumns(Math.max(1, Math.floor((width + GRID_GAP) / (targetWidth + GRID_GAP))))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [targetWidth])

  return [ref, columns, gutter]
}

export function LibraryView({ onSelect, onCountChange, refreshKey }: Props): React.JSX.Element {
  const [books, setBooks] = useState<BookListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>(loadView)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [watchingOnly, setWatchingOnly] = useState(false)
  // 둘 다 켜져 있거나 둘 다 꺼져 있으면 전체를 보여준다.
  const [originFilter, setOriginFilter] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>('custom')
  const [reorderMode, setReorderMode] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const [gridRef, columns, gutter] = useGridColumns(POSTER_WIDTH)

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  // 예전에 저장된 책 중 "(지은이)" 꼬리표가 불필요하게 남아 있는 것들을 조용히 정리한다.
  // 이미 깔끔한 책은 매번 건너뛰므로 라이브러리를 열 때마다 실행해도 비용이 거의 없다.
  function cleanupSoleAuthorTags(items: BookListItem[]): void {
    for (const { item } of items) {
      const cleaned = stripSoleAuthorTag(item.metadata.author)
      if (cleaned === item.metadata.author) continue
      const nextMetadata = { ...item.metadata, author: cleaned }
      updateBookInfo(item.id, item.title, item.posterUrl, nextMetadata)
        .then(() => {
          setBooks((prev) =>
            prev.map((b) =>
              b.item.id === item.id ? { ...b, item: { ...b.item, metadata: nextMetadata } } : b
            )
          )
        })
        .catch(() => {})
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on refreshKey change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    listBooks()
      .then((result) => {
        setBooks(result)
        onCountChange(result.length)
        cleanupSoleAuthorTags(result)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  function updateRecordInList(contentItemId: string, updated: BookListItem['record']): void {
    setBooks((prev) =>
      prev.map((b) => (b.item.id === contentItemId ? { ...b, record: updated } : b))
    )
  }

  // 보고 싶어요/보는 중은 배타적인 상태라, withoutStatusTags로 둘 다 지운 뒤 필요하면 하나만
  // 다시 넣는다. 이미 켜져 있던 태그를 다시 누르면 "둘 다 아님"으로 돌아간다.
  async function toggleStatus(
    itemId: string,
    record: NonNullable<BookListItem['record']>,
    tag: '보고 싶음' | '보는 중',
    active: boolean
  ): Promise<void> {
    const tags = active ? withoutStatusTags(record.tags) : [...withoutStatusTags(record.tags), tag]
    await updateUserRecord(record.id, { tags })
    updateRecordInList(itemId, { ...record, tags })
  }

  const categoryOptions = useMemo(
    () => unique(books.map((b) => categoryGroup(b.item.metadata.category))),
    [books]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = books

    if (q) {
      result = result.filter(
        ({ item }) =>
          item.title.toLowerCase().includes(q) ||
          (item.metadata.author ?? '').toLowerCase().includes(q)
      )
    }
    if (categoryFilter.length > 0) {
      result = result.filter(({ item }) =>
        categoryFilter.includes(categoryGroup(item.metadata.category) ?? '')
      )
    }
    if (originFilter.length > 0 && originFilter.length < ORIGINS.length) {
      result = result.filter(({ item }) =>
        originFilter.includes(categoryOrigin(item.metadata.category) ?? '')
      )
    }
    if (wishlistOnly) {
      result = result.filter(({ record }) => record && isWishlisted(record.tags))
    }
    if (watchingOnly) {
      result = result.filter(({ record }) => record && isWatching(record.tags))
    }

    const primaryCompare: Record<SortKey, (a: BookListItem, b: BookListItem) => number> = {
      custom: (a, b) =>
        (a.item.displayOrder ?? MISSING_ORDER) - (b.item.displayOrder ?? MISSING_ORDER),
      added_desc: (a, b) => Date.parse(b.item.createdAt) - Date.parse(a.item.createdAt),
      added_asc: (a, b) => Date.parse(a.item.createdAt) - Date.parse(b.item.createdAt),
      rating_desc: (a, b) => (b.record?.myRating ?? 0) - (a.record?.myRating ?? 0),
      rating_asc: (a, b) => (a.record?.myRating ?? 0) - (b.record?.myRating ?? 0),
      watched_desc: (a, b) =>
        parseWatchedAt(b.record?.lastWatchedAt) - parseWatchedAt(a.record?.lastWatchedAt),
      watch_count_desc: (a, b) => (b.record?.watchCount ?? 0) - (a.record?.watchCount ?? 0)
    }

    const sorted = [...result].sort((a, b) => {
      const primary = primaryCompare[sort](a, b)
      if (primary !== 0) return primary
      return a.item.title.localeCompare(b.item.title, 'ko')
    })
    return sorted
  }, [books, query, categoryFilter, originFilter, wishlistOnly, watchingOnly, sort])

  // 순서 변경은 사용자 지정순 + 목록 보기 + 아무 필터도 안 걸려 있을 때만 허용한다.
  // 필터링된 부분집합만 보이는 상태에서 드래그하면 전체 순서와 어긋나 보이기 때문.
  const reorderable =
    sort === 'custom' &&
    view === 'list' &&
    !query.trim() &&
    categoryFilter.length === 0 &&
    !(originFilter.length > 0 && originFilter.length < ORIGINS.length) &&
    !wishlistOnly &&
    !watchingOnly

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 검색/필터로 reorderable이 꺼지면 순서 변경 모드도 즉시 꺼야 한다
    if (!reorderable) setReorderMode(false)
  }, [reorderable])

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = filtered.findIndex((b) => b.item.id === active.id)
    const newIndex = filtered.findIndex((b) => b.item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(filtered, oldIndex, newIndex)
    const orderedValues = reordered
      .filter((_, i) => i !== newIndex)
      .map((b) => b.item.displayOrder ?? MISSING_ORDER)
    const nextOrder = computeDisplayOrderForInsert(orderedValues, newIndex)
    const movedId = active.id as string
    updateBookDisplayOrder(movedId, nextOrder)
      .then(() => {
        setBooks((prev) =>
          prev.map((b) =>
            b.item.id === movedId ? { ...b, item: { ...b.item, displayOrder: nextOrder } } : b
          )
        )
      })
      .catch((err) => setError(errorMessage(err)))
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0 24px 28px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 13.5,
          paddingRight: 28
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap'
          }}
        >
          <h2 style={{ margin: 0, flex: 'none', whiteSpace: 'nowrap' }}>책</h2>
          <div style={{ position: 'relative', width: 240, flex: 'none' }}>
            <MagnifyingGlass
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-neutral-500)'
              }}
            />
            <input
              className="input"
              style={{ paddingLeft: 30 }}
              placeholder="보관된 콘텐츠 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 12 }} />
          <div className="seg" style={{ flex: 'none' }}>
            <label
              className="seg-opt"
              style={{
                padding: '10px 14px',
                boxShadow: 'none',
                color: view === 'grid' ? 'var(--color-accent)' : undefined,
                background:
                  view === 'grid'
                    ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                    : undefined
              }}
            >
              <input
                type="radio"
                name="view"
                checked={view === 'grid'}
                onChange={() => setView('grid')}
              />
              <SquaresFour size={16} />
            </label>
            <label
              className="seg-opt"
              style={{
                padding: '10px 14px',
                boxShadow: 'none',
                color: view === 'list' ? 'var(--color-accent)' : undefined,
                background:
                  view === 'list'
                    ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                    : undefined
              }}
            >
              <input
                type="radio"
                name="view"
                checked={view === 'list'}
                onChange={() => setView('list')}
              />
              <ListBullets size={16} />
            </label>
          </div>
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
        >
          {SHOW_FILTERS ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <FilterDropdown
                label="카테고리"
                options={categoryOptions}
                selected={categoryFilter}
                onChange={setCategoryFilter}
              />
              <button
                type="button"
                className={wishlistOnly ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ minHeight: 28, padding: '0 12px', fontSize: 12 }}
                onClick={() => setWishlistOnly((v) => !v)}
              >
                <Heart size={12} weight={wishlistOnly ? 'fill' : 'regular'} />
                보고 싶어요
              </button>
              <button
                type="button"
                className={watchingOnly ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ minHeight: 28, padding: '0 12px', fontSize: 12 }}
                onClick={() => setWatchingOnly((v) => !v)}
              >
                <Eye size={12} weight={watchingOnly ? 'fill' : 'regular'} />
                보는 중
              </button>
              {ORIGINS.map((origin) => (
                <button
                  key={origin}
                  type="button"
                  className={
                    originFilter.includes(origin) ? 'btn btn-primary' : 'btn btn-secondary'
                  }
                  style={{ minHeight: 28, padding: '0 12px', fontSize: 12 }}
                  onClick={() =>
                    setOriginFilter((prev) =>
                      prev.includes(origin) ? prev.filter((o) => o !== origin) : [...prev, origin]
                    )
                  }
                >
                  {origin}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <button
              type="button"
              className={reorderMode ? 'btn btn-primary' : 'btn btn-secondary'}
              disabled={!reorderable}
              style={{
                minHeight: 28,
                padding: '0 12px',
                fontSize: 12,
                opacity: reorderable ? 1 : 0.45,
                cursor: reorderable ? 'pointer' : 'not-allowed'
              }}
              onClick={() => setReorderMode((v) => !v)}
              title={
                reorderable
                  ? undefined
                  : '사용자 지정순 · 목록 보기이고, 검색어나 필터가 없을 때만 순서를 바꿀 수 있어요'
              }
            >
              <ArrowsDownUp size={12} />
              순서 변경
            </button>
            <select
              className="input"
              style={{
                width: 'auto',
                flex: 'none',
                minHeight: 28,
                paddingTop: 3,
                paddingBottom: 3,
                paddingLeft: 10,
                paddingRight: 20,
                fontSize: 12,
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239397ab' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 8l5 5 5-5'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 2px center',
                backgroundSize: '8px 8px'
              }}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        ref={gridRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          minWidth: 0,
          marginRight: gutter
        }}
      >
        {loading && books.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-neutral-500)',
              paddingRight: gutter
            }}
          >
            불러오는 중...
          </div>
        ) : error ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e08a8a',
              paddingRight: gutter
            }}
          >
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--color-neutral-500)',
              paddingRight: gutter
            }}
          >
            {books.length === 0
              ? '아직 보관된 책이 없어요. 사이드바의 "검색 · 추가"에서 첫 책을 보관해보세요.'
              : '조건에 맞는 책이 없어요.'}
          </div>
        ) : view === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: 18,
              paddingBottom: 12,
              paddingRight: gutter
            }}
          >
            {filtered.map(({ item, record }) => (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minWidth: 0
                }}
              >
                {isManualPosterUrl(item.posterUrl) ? (
                  <CanvasPoster url={item.posterUrl as string} />
                ) : (
                  <div style={poster(item.posterUrl)} />
                )}
                <div>
                  <div
                    title={item.title}
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--color-neutral-500)',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {authorNames(item.metadata.author) ?? '—'} ·{' '}
                    {categoryGroup(item.metadata.category) ?? '—'}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <StarRating rating={record?.myRating ?? null} />
                    {record && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <StatusIconButton
                          icon={Heart}
                          active={isWishlisted(record.tags)}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStatus(item.id, record, '보고 싶음', isWishlisted(record.tags))
                          }}
                        />
                        <StatusIconButton
                          icon={Eye}
                          active={isWatching(record.tags)}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStatus(item.id, record, '보는 중', isWatching(record.tags))
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table
              className="table"
              style={{ tableLayout: 'fixed', width: `calc(100% - ${gutter}px)` }}
            >
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '31%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>제목</th>
                  <th>카테고리</th>
                  <th style={{ padding: 0 }}>
                    <span style={{ marginLeft: -6, display: 'inline-block' }}>페이지</span>
                  </th>
                  <th>나의 평점</th>
                  <th>상태</th>
                  <th>마지막 읽음</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={filtered.map(({ item }) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filtered.map(({ item, record }) => (
                    <BookRow
                      key={item.id}
                      item={item}
                      record={record}
                      reorderMode={reorderMode}
                      onSelect={onSelect}
                      toggleStatus={toggleStatus}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        )}
      </div>
    </div>
  )
}
