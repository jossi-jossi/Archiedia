import {
  ArrowsDownUp,
  Eye,
  Heart,
  ListBullets,
  MagnifyingGlass,
  SquaresFour,
  Star
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { listSeries, updateSeriesDisplayOrder, updateUserRecord, SeriesListItem } from './api'
import { errorMessage } from '../../lib/errors'
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
  { value: 'watched_desc', label: '최근 시청순' },
  { value: 'watch_count_desc', label: '시청 횟수 높은순' }
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

const poster = (url: string | null): React.CSSProperties => ({
  aspectRatio: '2 / 3',
  borderRadius: 'var(--radius-md)',
  position: 'relative',
  overflow: 'hidden',
  background: url
    ? `center / cover no-repeat url(${url})`
    : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)'
})

function parseWatchedAt(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function unique(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort()
}

const SHOW_FILTERS = true

const POSTER_WIDTH = 150
const GRID_GAP = 18
// 헤더 행(제목/검색/토글, 필터/정렬)의 오른쪽 여백과 같은 값. 마지막 카드가 여기 맞춰진다.
const HEADER_RIGHT_MARGIN = 28

const VIEW_KEY = 'archiedia:seriesLibraryView'

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
  const [series, setSeries] = useState<SeriesListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>(loadView)
  const [query, setQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState<string[]>([])
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [watchingOnly, setWatchingOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('custom')
  const [reorderMode, setReorderMode] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [orderPreview, setOrderPreview] = useState<SeriesListItem[] | null>(null)
  const draggedItemId = useRef<string | null>(null)
  const [gridRef, columns, gutter] = useGridColumns(POSTER_WIDTH)

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on refreshKey change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    listSeries()
      .then((result) => {
        setSeries(result)
        onCountChange(result.length)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  function updateRecordInList(contentItemId: string, updated: SeriesListItem['record']): void {
    setSeries((prev) =>
      prev.map((s) => (s.item.id === contentItemId ? { ...s, record: updated } : s))
    )
  }

  // 보고 싶어요/보는 중은 배타적인 상태라, withoutStatusTags로 둘 다 지운 뒤 필요하면 하나만
  // 다시 넣는다. 이미 켜져 있던 태그를 다시 누르면 "둘 다 아님"으로 돌아간다.
  async function toggleStatus(
    itemId: string,
    record: NonNullable<SeriesListItem['record']>,
    tag: '보고 싶음' | '보는 중',
    active: boolean
  ): Promise<void> {
    const tags = active ? withoutStatusTags(record.tags) : [...withoutStatusTags(record.tags), tag]
    await updateUserRecord(record.id, { tags })
    updateRecordInList(itemId, { ...record, tags })
  }

  const genreOptions = useMemo(
    () => unique(series.flatMap((s) => s.item.metadata.genres)),
    [series]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = series

    if (q) {
      result = result.filter(
        ({ item }) =>
          item.title.toLowerCase().includes(q) ||
          (item.metadata.originalTitle ?? '').toLowerCase().includes(q)
      )
    }
    if (genreFilter.length > 0) {
      result = result.filter(({ item }) =>
        item.metadata.genres.some((g) => genreFilter.includes(g))
      )
    }
    if (wishlistOnly) {
      result = result.filter(({ record }) => record && isWishlisted(record.tags))
    }
    if (watchingOnly) {
      result = result.filter(({ record }) => record && isWatching(record.tags))
    }

    const primaryCompare: Record<SortKey, (a: SeriesListItem, b: SeriesListItem) => number> = {
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
  }, [series, query, genreFilter, wishlistOnly, watchingOnly, sort])

  // 순서 변경은 사용자 지정순 + 목록 보기 + 아무 필터도 안 걸려 있을 때만 허용한다.
  // 필터링된 부분집합만 보이는 상태에서 드래그하면 전체 순서와 어긋나 보이기 때문.
  const reorderable =
    sort === 'custom' &&
    view === 'list' &&
    !query.trim() &&
    genreFilter.length === 0 &&
    !wishlistOnly &&
    !watchingOnly

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 검색/필터로 reorderable이 꺼지면 순서 변경 모드도 즉시 꺼야 한다
    if (!reorderable) setReorderMode(false)
  }, [reorderable])

  function handleDragOver(index: number): void {
    if (dragIndex === null || dragIndex === index) return
    setOrderPreview((prev) => {
      if (!prev) return prev
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(index)
  }

  async function commitReorder(): Promise<void> {
    const list = orderPreview
    setDragIndex(null)
    setOrderPreview(null)
    if (!list) return
    const movedIndex = list.findIndex((s) => s.item.id === draggedItemId.current)
    if (movedIndex === -1) return
    const orderedValues = list
      .filter((_, i) => i !== movedIndex)
      .map((s) => s.item.displayOrder ?? MISSING_ORDER)
    const nextOrder = computeDisplayOrderForInsert(orderedValues, movedIndex)
    const movedId = list[movedIndex].item.id
    try {
      await updateSeriesDisplayOrder(movedId, nextOrder)
      setSeries((prev) =>
        prev.map((s) =>
          s.item.id === movedId ? { ...s, item: { ...s.item, displayOrder: nextOrder } } : s
        )
      )
    } catch (err) {
      setError(errorMessage(err))
    }
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
          <h2 style={{ margin: 0, flex: 'none', whiteSpace: 'nowrap' }}>시리즈</h2>
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
                label="장르"
                options={genreOptions}
                selected={genreFilter}
                onChange={setGenreFilter}
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
        {loading && series.length === 0 ? (
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
            {series.length === 0
              ? '아직 보관된 시리즈가 없어요. 사이드바의 "검색 · 추가"에서 첫 시리즈를 보관해보세요.'
              : '조건에 맞는 시리즈가 없어요.'}
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
                <div style={poster(item.posterUrl)} />
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
                    {item.metadata.releaseYear ?? '—'} · {item.metadata.genres.join(', ') || '—'}
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
          <table
            className="table"
            style={{ tableLayout: 'fixed', width: `calc(100% - ${gutter}px)` }}
          >
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>제목</th>
                <th>장르</th>
                <th style={{ padding: 0 }}>
                  <span style={{ marginLeft: -6, display: 'inline-block' }}>회차</span>
                </th>
                <th>나의 평점</th>
                <th>상태</th>
                <th>마지막 시청</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(orderPreview ?? filtered).map(({ item, record }, index) => (
                <tr
                  key={item.id}
                  onClick={reorderMode ? undefined : () => onSelect(item.id)}
                  draggable={reorderMode}
                  onDragStart={() => {
                    draggedItemId.current = item.id
                    setOrderPreview(filtered)
                    setDragIndex(index)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    handleDragOver(index)
                  }}
                  onDrop={(e) => e.preventDefault()}
                  onDragEnd={() => {
                    void commitReorder()
                  }}
                  style={{ cursor: reorderMode ? 'grab' : 'pointer' }}
                >
                  <td style={{ width: 40 }}>
                    <div
                      style={{
                        width: 32,
                        height: 45,
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
                      {item.metadata.releaseYear ?? '—'}
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
                    title={item.metadata.genres.join(', ') || undefined}
                  >
                    {item.metadata.genres.join(', ') || '—'}
                  </td>
                  <td style={{ color: 'var(--color-neutral-400)', padding: 0 }}>
                    <span style={{ marginLeft: -6, display: 'inline-block' }}>
                      {item.metadata.seasons.length
                        ? `${item.metadata.seasons.reduce((sum, s) => sum + s.episodeCount, 0)}부`
                        : '—'}
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
                  <td style={{ color: 'var(--color-neutral-500)' }}>
                    {record?.lastWatchedAt ?? '—'}
                  </td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
