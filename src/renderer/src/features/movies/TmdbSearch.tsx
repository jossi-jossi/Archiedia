import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/errors'
import { getMovieDetails, searchMovies, TmdbSearchResult } from '../../lib/tmdb'
import type { AddMovieInitial } from './AddMovieForm'

interface Props {
  query: string
  onPick: (initial: AddMovieInitial) => void
}

const SEARCH_DEBOUNCE_MS = 350

export function TmdbSearch({ query, onPick }: Props): React.JSX.Element {
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when the search box is emptied
      setResults([])
      return
    }

    setSearching(true)
    setError(null)
    const timer = setTimeout(() => {
      searchMovies(trimmed)
        .then(setResults)
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setSearching(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  async function handlePick(result: TmdbSearchResult): Promise<void> {
    setError(null)
    setLoadingId(result.id)
    try {
      const details = await getMovieDetails(result.id)
      onPick({
        title: details.title,
        posterUrl: details.posterUrl,
        metadata: details.metadata
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      {error && <div style={{ fontSize: 13, color: '#e08a8a', marginBottom: 12 }}>{error}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16
        }}
      >
        {results.map((r) => (
          <div
            key={r.id}
            onClick={() => (loadingId ? undefined : handlePick(r))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 10,
              borderRadius: 'var(--radius-md)',
              cursor: loadingId ? 'default' : 'pointer',
              opacity: loadingId && loadingId !== r.id ? 0.5 : 1,
              background: 'color-mix(in srgb, var(--color-text) 3%, transparent)'
            }}
          >
            <div
              style={{
                width: 46,
                height: 66,
                flex: 'none',
                borderRadius: 4,
                background: r.posterUrl
                  ? `center / cover no-repeat url(${r.posterUrl})`
                  : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 5px, var(--color-neutral-900) 5px, var(--color-neutral-900) 10px)'
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>
                {r.originalTitle} · {r.year ?? '—'}
              </div>
              {loadingId === r.id && (
                <div style={{ fontSize: 11, color: 'var(--color-accent)', marginTop: 2 }}>
                  불러오는 중...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!searching && query.trim() && results.length === 0 && (
        <div style={{ color: 'var(--color-neutral-500)', marginTop: 8 }}>검색 결과가 없어요.</div>
      )}
    </div>
  )
}
