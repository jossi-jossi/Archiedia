import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { FormEvent, useState } from 'react'
import { errorMessage } from '../../lib/errors'
import { getMovieDetails, searchMovies, TmdbSearchResult } from '../../lib/tmdb'
import type { AddMovieInitial } from './AddMovieForm'

interface Props {
  onPick: (initial: AddMovieInitial) => void
}

export function TmdbSearch({ onPick }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!query.trim()) return
    setError(null)
    setSearching(true)
    try {
      setResults(await searchMovies(query.trim()))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSearching(false)
    }
  }

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
      <form
        onSubmit={handleSearch}
        style={{ position: 'relative', maxWidth: 520, marginBottom: 18 }}
      >
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
          placeholder="TMDB에서 영화 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      {searching && <div style={{ color: 'var(--color-neutral-500)' }}>검색 중...</div>}
      {error && <div style={{ fontSize: 13, color: '#e08a8a' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 640 }}>
        {results.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 4px',
              borderBottom: '1px solid var(--color-divider)'
            }}
          >
            <div
              style={{
                width: 38,
                height: 54,
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
            </div>
            <span className="tag tag-outline">TMDB</span>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={loadingId === r.id}
              onClick={() => handlePick(r)}
            >
              <Plus />
              {loadingId === r.id ? '불러오는 중...' : '선택'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
