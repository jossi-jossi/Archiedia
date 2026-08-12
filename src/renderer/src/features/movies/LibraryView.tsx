import { ListBullets, MagnifyingGlass, Plus, SquaresFour, Star } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { listMovies, MovieListItem } from './api'

interface Props {
  onAdd: () => void
  onSelect: (id: string) => void
  onCountChange: (count: number) => void
  refreshKey: number
}

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

export function LibraryView({
  onAdd,
  onSelect,
  onCountChange,
  refreshKey
}: Props): React.JSX.Element {
  const [movies, setMovies] = useState<MovieListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return movies
    return movies.filter(
      ({ item }) =>
        item.title.toLowerCase().includes(q) ||
        (item.metadata.originalTitle ?? '').toLowerCase().includes(q)
    )
  }, [movies, query])

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
          marginBottom: 18,
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
        <button
          className="btn btn-primary"
          style={{ flex: 'none', whiteSpace: 'nowrap' }}
          onClick={onAdd}
        >
          <Plus />
          추가
        </button>
      </div>

      {loading && <div style={{ color: 'var(--color-neutral-500)' }}>불러오는 중...</div>}
      {error && <div style={{ color: '#e08a8a' }}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ color: 'var(--color-neutral-500)' }}>
          아직 등록된 영화가 없어요. &quot;추가&quot; 버튼으로 첫 영화를 등록해보세요.
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, minWidth: 0 }}>
        {view === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
              gap: 18,
              paddingBottom: 12
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
                  <div style={{ marginTop: 5 }}>
                    <StarRating rating={record?.myRating ?? null} />
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
