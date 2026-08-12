import { Heart, ListBullets, MagnifyingGlass, SquaresFour, Star } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { listMovies, MovieListItem } from './api'
import { errorMessage } from '../../lib/errors'
import { FilterDropdown } from './FilterDropdown'
import { StatusQuickEdit } from './StatusQuickEdit'
import { displayTag, isWishlisted } from './wishlist'

interface Props {
  onSelect: (id: string) => void
  onCountChange: (count: number) => void
  refreshKey: number
}

type SortKey =
  'added_desc' | 'added_asc' | 'rating_desc' | 'rating_asc' | 'watched_desc' | 'watch_count_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'added_desc', label: '보관 최신순' },
  { value: 'added_asc', label: '보관 오래된순' },
  { value: 'rating_desc', label: '나의 평점 높은순' },
  { value: 'rating_asc', label: '나의 평점 낮은순' },
  { value: 'watched_desc', label: '최근 관람순' },
  { value: 'watch_count_desc', label: '관람 횟수 높은순' }
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

const poster = (url: string | null): React.CSSProperties => ({
  aspectRatio: '2 / 3',
  borderRadius: 'var(--radius-md)',
  position: 'relative',
  overflow: 'hidden',
  background: url
    ? `center / cover no-repeat url(${url})`
    : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)'
})

function unique(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort()
}

const SHOW_FILTERS = true

const POSTER_WIDTH = 150
const GRID_GAP = 18
// 헤더 행(제목/검색/토글, 필터/정렬)의 오른쪽 여백과 같은 값. 마지막 카드가 여기 맞춰진다.
const HEADER_RIGHT_MARGIN = 28

const VIEW_KEY = 'archiedia:libraryView'

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
  const [movies, setMovies] = useState<MovieListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>(loadView)
  const [query, setQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState<string[]>([])
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('added_desc')
  const [gridRef, columns, gutter] = useGridColumns(POSTER_WIDTH)

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on refreshKey change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    listMovies()
      .then((result) => {
        setMovies(result)
        onCountChange(result.length)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  function updateRecordInList(contentItemId: string, updated: MovieListItem['record']): void {
    setMovies((prev) =>
      prev.map((m) => (m.item.id === contentItemId ? { ...m, record: updated } : m))
    )
  }

  const genreOptions = useMemo(
    () => unique(movies.flatMap((m) => m.item.metadata.genres)),
    [movies]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = movies

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

    const primaryCompare: Record<SortKey, (a: MovieListItem, b: MovieListItem) => number> = {
      added_desc: (a, b) => Date.parse(b.item.createdAt) - Date.parse(a.item.createdAt),
      added_asc: (a, b) => Date.parse(a.item.createdAt) - Date.parse(b.item.createdAt),
      rating_desc: (a, b) => (b.record?.myRating ?? 0) - (a.record?.myRating ?? 0),
      rating_asc: (a, b) => (a.record?.myRating ?? 0) - (b.record?.myRating ?? 0),
      watched_desc: (a, b) =>
        (b.record?.lastWatchedAt ? Date.parse(b.record.lastWatchedAt) : 0) -
        (a.record?.lastWatchedAt ? Date.parse(a.record.lastWatchedAt) : 0),
      watch_count_desc: (a, b) => (b.record?.watchCount ?? 0) - (a.record?.watchCount ?? 0)
    }

    const sorted = [...result].sort((a, b) => {
      const primary = primaryCompare[sort](a, b)
      if (primary !== 0) return primary
      return a.item.title.localeCompare(b.item.title, 'ko')
    })
    return sorted
  }, [movies, query, genreFilter, wishlistOnly, sort])

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
          <h2 style={{ margin: 0, flex: 'none', whiteSpace: 'nowrap' }}>라이브러리</h2>
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
            </div>
          ) : (
            <div />
          )}
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
        {loading ? (
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
            {movies.length === 0
              ? '아직 보관된 영화가 없어요. 사이드바의 "검색 · 추가"에서 첫 영화를 보관해보세요.'
              : '조건에 맞는 영화가 없어요.'}
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
                <div style={poster(item.posterUrl)}>
                  {record && isWishlisted(record.tags) && (
                    <div
                      className="tag tag-accent-2"
                      style={{ position: 'absolute', top: 8, left: 8 }}
                    >
                      보고 싶어요
                    </div>
                  )}
                </div>
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
                      <StatusQuickEdit
                        record={record}
                        onChange={(r) => updateRecordInList(item.id, r)}
                      />
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
              <col style={{ width: '24%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>제목</th>
                <th>장르</th>
                <th style={{ padding: 0 }}>
                  <span style={{ marginLeft: -6, display: 'inline-block' }}>길이</span>
                </th>
                <th>나의 평점</th>
                <th>상태</th>
                <th>마지막 관람</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ item, record }) => (
                <tr key={item.id} onClick={() => onSelect(item.id)} style={{ cursor: 'pointer' }}>
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
                      {item.metadata.runtimeMinutes ? `${item.metadata.runtimeMinutes}분` : '—'}
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
                      <StatusQuickEdit
                        record={record}
                        onChange={(r) => updateRecordInList(item.id, r)}
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
