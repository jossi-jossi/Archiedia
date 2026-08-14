import { Check, Plus } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/errors'
import { getBookDetails, searchBooks, shortCategory, BookSearchResult } from '../../lib/aladin'
import { createBook, getArchivedAladinIds } from './api'

interface Props {
  query: string
  onArchived: () => void
}

const SEARCH_DEBOUNCE_MS = 350

export function AladinSearch({ query, onArchived }: Props): React.JSX.Element {
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [archivingId, setArchivingId] = useState<number | null>(null)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getArchivedAladinIds()
      .then(setArchivedIds)
      .catch((err) => setError(errorMessage(err)))
  }, [])

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
      searchBooks(trimmed)
        .then(setResults)
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setSearching(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  async function handleArchive(result: BookSearchResult): Promise<void> {
    setError(null)
    setArchivingId(result.id)
    try {
      const details = await getBookDetails(result.id)
      await createBook({
        title: details.title,
        posterUrl: details.posterUrl,
        externalId: String(result.id),
        metadata: details.metadata
      })
      setArchivedIds((prev) => new Set(prev).add(String(result.id)))
      onArchived()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <div>
      {error && <div style={{ fontSize: 13, color: '#e08a8a', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {results.map((r) => {
          const isArchived = archivedIds.has(String(r.id))
          const isArchiving = archivingId === r.id

          return (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 10,
                borderRadius: 'var(--radius-md)',
                background: 'color-mix(in srgb, var(--color-text) 3%, transparent)'
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 69,
                  flex: 'none',
                  borderRadius: 4,
                  background: r.posterUrl
                    ? `center / cover no-repeat url(${r.posterUrl})`
                    : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 5px, var(--color-neutral-900) 5px, var(--color-neutral-900) 10px)'
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{r.title}</div>
                  {r.isForeign && (
                    <span
                      className="tag tag-neutral"
                      style={{ flex: 'none', fontSize: 10, padding: '2px 6px', fontWeight: 400 }}
                    >
                      원서
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>
                  {r.author} · {shortCategory(r.category) ?? '—'}
                </div>
              </div>
              <button
                type="button"
                className={isArchived ? 'btn btn-secondary' : 'btn btn-primary'}
                disabled={isArchived || isArchiving}
                onClick={() => handleArchive(r)}
                style={{
                  flex: 'none',
                  whiteSpace: 'nowrap',
                  cursor: isArchived ? 'default' : undefined
                }}
              >
                {isArchived ? (
                  <>
                    <Check />
                    보관 중
                  </>
                ) : (
                  <>
                    <Plus />
                    {isArchiving ? '보관 중...' : '보관하기'}
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {!searching && query.trim() && results.length === 0 && (
        <div style={{ color: 'var(--color-neutral-500)', marginTop: 8 }}>검색 결과가 없어요.</div>
      )}
    </div>
  )
}
