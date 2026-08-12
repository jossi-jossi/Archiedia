import { ListBullets, MagnifyingGlass, SquaresFour, Star } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { listMovies, MovieListItem } from './api'
import { FilterDropdown } from './FilterDropdown'
import { StatusQuickEdit } from './StatusQuickEdit'

interface Props {
  onSelect: (id: string) => void
  onCountChange: (count: number) => void
  refreshKey: number
}

type SortKey = 'year_desc' | 'year_asc' | 'rating_desc' | 'rating_asc' | 'watched_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'year_desc', label: '개봉연도 최신순' },
  { value: 'year_asc', label: '개봉연도 오래된순' },
  { value: 'rating_desc', label: '나의 평점 높은순' },
  { value: 'rating_asc', label: '나의 평점 낮은순' },
  { value: 'watched_desc', label: '최근 관람순' }
]

function StarRating({ rating }: { rating: number | null }): React.JSX.Element {
  const filled = rating ?? 0
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          weight={i < filled ? 'fill' : 'regular'}
          color={i < filled ? 'var(--color-accent)' : 'var(--color-neutral-700)'}
        />
      ))}
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

const POSTER_WIDTH = 180
const GRID_GAP = 18
const GRID_RIGHT_GUTTER = 16

// 컨테이너 폭을 실측해서 POSTER_WIDTH를 "목표 크기"로 삼아 정확히 들어가는 열 수를 계산한다.
// auto-fill + 고정폭 방식은 열이 하나 늘어나기 직전 스크롤바 앞에 카드 한 칸만큼의 공백이 생기는데,
// 열 수를 직접 계산해 1fr로 분배하면 그 공백이 카드 사이로 흩어져 사라진다.
// GRID_RIGHT_GUTTER만큼은 항상 스크롤바 앞 여백으로 고정 확보한다 (grid 쪽 paddingRight와 짝을 맞춰야 함).
function useGridColumns(targetWidth: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function recompute(): void {
      const width = el!.clientWidth - GRID_RIGHT_GUTTER
      setColumns(Math.max(1, Math.floor((width + GRID_GAP) / (targetWidth + GRID_GAP))))
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [targetWidth])

  return [ref, columns]
}

export function LibraryView({ onSelect, onCountChange, refreshKey }: Props): React.JSX.Element {
  const [movies, setMovies] = useState<MovieListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [mediumFilter, setMediumFilter] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>('year_desc')
  const [gridRef, columns] = useGridColumns(POSTER_WIDTH)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on refreshKey change needs to reset the loading flag before the async call resolves
    setLoading(true)
    listMovies()
      .then((result) => {
        setMovies(result)
        onCountChange(result.length)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
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
  const tagOptions = useMemo(() => unique(movies.flatMap((m) => m.record?.tags ?? [])), [movies])
  const mediumOptions = useMemo(() => unique(movies.map((m) => m.record?.watchMedium)), [movies])

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
    if (tagFilter.length > 0) {
      result = result.filter(({ record }) => record?.tags.some((t) => tagFilter.includes(t)))
    }
    if (mediumFilter.length > 0) {
      result = result.filter(
        ({ record }) => record?.watchMedium && mediumFilter.includes(record.watchMedium)
      )
    }

    const sorted = [...result]
    switch (sort) {
      case 'year_desc':
        sorted.sort(
          (a, b) => (b.item.metadata.releaseYear ?? 0) - (a.item.metadata.releaseYear ?? 0)
        )
        break
      case 'year_asc':
        sorted.sort(
          (a, b) => (a.item.metadata.releaseYear ?? 0) - (b.item.metadata.releaseYear ?? 0)
        )
        break
      case 'rating_desc':
        sorted.sort((a, b) => (b.record?.myRating ?? 0) - (a.record?.myRating ?? 0))
        break
      case 'rating_asc':
        sorted.sort((a, b) => (a.record?.myRating ?? 0) - (b.record?.myRating ?? 0))
        break
      case 'watched_desc':
        sorted.sort(
          (a, b) =>
            (b.record?.lastWatchedAt ? Date.parse(b.record.lastWatchedAt) : 0) -
            (a.record?.lastWatchedAt ? Date.parse(a.record.lastWatchedAt) : 0)
        )
        break
    }
    return sorted
  }, [movies, query, genreFilter, tagFilter, mediumFilter, sort])

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 28px',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 14,
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
        <select
          className="input"
          style={{ width: 'auto', flex: 'none' }}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="seg" style={{ flex: 'none' }}>
          <label className="seg-opt">
            <input
              type="radio"
              name="view"
              checked={view === 'grid'}
              onChange={() => setView('grid')}
            />
            <SquaresFour />
          </label>
          <label className="seg-opt">
            <input
              type="radio"
              name="view"
              checked={view === 'list'}
              onChange={() => setView('list')}
            />
            <ListBullets />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flex: 'none', flexWrap: 'wrap' }}>
        <FilterDropdown
          label="장르"
          options={genreOptions}
          selected={genreFilter}
          onChange={setGenreFilter}
        />
        <FilterDropdown
          label="태그"
          options={tagOptions}
          selected={tagFilter}
          onChange={setTagFilter}
        />
        <FilterDropdown
          label="관람 매체"
          options={mediumOptions}
          selected={mediumFilter}
          onChange={setMediumFilter}
        />
      </div>

      {loading && <div style={{ color: 'var(--color-neutral-500)' }}>불러오는 중...</div>}
      {error && <div style={{ color: '#e08a8a' }}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ color: 'var(--color-neutral-500)' }}>
          {movies.length === 0
            ? '아직 등록된 영화가 없어요. 사이드바의 "검색 · 추가"에서 첫 영화를 등록해보세요.'
            : '조건에 맞는 영화가 없어요.'}
        </div>
      )}

      <div
        ref={gridRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, minWidth: 0 }}
      >
        {view === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: 18,
              paddingBottom: 12,
              paddingRight: GRID_RIGHT_GUTTER
            }}
          >
            {filtered.map(({ item, record }) => (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={poster(item.posterUrl)}>
                  {record?.tags.includes('보고싶음') && (
                    <div
                      className="tag tag-accent-2"
                      style={{ position: 'absolute', top: 8, left: 8 }}
                    >
                      보고싶음
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-neutral-500)', marginTop: 2 }}>
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
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>제목</th>
                <th>장르</th>
                <th>나의 평점</th>
                <th>상태</th>
                <th>관람 매체</th>
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
                        ...poster(item.posterUrl),
                        aspectRatio: undefined
                      }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>
                      {item.metadata.releaseYear ?? '—'}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-neutral-400)' }}>
                    {item.metadata.genres.join(', ') || '—'}
                  </td>
                  <td>
                    <StarRating rating={record?.myRating ?? null} />
                  </td>
                  <td>
                    {record?.tags.map((tag) => (
                      <span key={tag} className="tag tag-neutral" style={{ marginRight: 4 }}>
                        {tag}
                      </span>
                    )) || '—'}
                  </td>
                  <td style={{ color: 'var(--color-neutral-500)' }}>
                    {record?.watchMedium ?? '—'}
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
