import { PlayCircle, Star, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { getMovie, Movie, updateUserRecord } from './api'
import type { UserRecord } from '@archiedia/schema'
import { errorMessage } from '../../lib/errors'

interface Props {
  movieId: string
  onClose: () => void
}

const DIALOG_WIDTH = 860
const DIALOG_HEIGHT = 600

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function MovieDetail({ movieId, onClose }: Props): React.JSX.Element {
  const [movie, setMovie] = useState<Movie | null>(null)
  const [record, setRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tagsInput, setTagsInput] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on movieId change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    getMovie(movieId)
      .then((result) => {
        setMovie(result?.item ?? null)
        setRecord(result?.record ?? null)
        setTagsInput(result?.record?.tags.join(', ') ?? '')
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [movieId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function save(patch: Partial<UserRecord>): Promise<void> {
    if (!record) return
    setSaving(true)
    try {
      await updateUserRecord(record.id, patch)
      setRecord({ ...record, ...patch })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const meta = movie?.metadata

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        style={{
          width: DIALOG_WIDTH,
          maxWidth: 'none',
          height: DIALOG_HEIGHT,
          position: 'relative',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          style={{ position: 'absolute', top: 8, right: 8, padding: 6 }}
        >
          <X size={18} />
        </button>

        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            불러오는 중...
          </div>
        )}
        {!loading && error && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e08a8a'
            }}
          >
            {error}
          </div>
        )}
        {!loading && !error && !movie && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            영화를 찾을 수 없어요.
          </div>
        )}

        {!loading && !error && movie && meta && (
          <div style={{ display: 'flex', gap: 24, height: '100%', minHeight: 0 }}>
            <div
              style={{
                height: '100%',
                aspectRatio: '2 / 3',
                flex: 'none',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
                background: movie.posterUrl
                  ? `center / cover no-repeat url(${movie.posterUrl})`
                  : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)'
              }}
            />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflowY: 'auto',
                paddingRight: 4,
                paddingTop: 20
              }}
            >
              <h2 style={{ margin: 0, paddingRight: 24 }}>{movie.title}</h2>
              <div style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 4 }}>
                {meta.originalTitle ?? movie.title} · {meta.releaseYear ?? '—'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {meta.genres.map((g) => (
                  <span key={g} className="tag tag-neutral">
                    {g}
                  </span>
                ))}
                {meta.runtimeMinutes && (
                  <span className="tag tag-outline">{meta.runtimeMinutes}분</span>
                )}
                {meta.country && <span className="tag tag-outline">{meta.country}</span>}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: 'var(--color-neutral-300)'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-neutral-500)' }}>감독</span> &nbsp;
                  {meta.director ?? '—'}
                </div>
                <div>
                  <span style={{ color: 'var(--color-neutral-500)' }}>출연</span> &nbsp;
                  {meta.actors.length ? meta.actors.join(', ') : '—'}
                </div>
              </div>
              {meta.trailerUrl && (
                <a href={meta.trailerUrl} target="_blank" rel="noreferrer">
                  <button className="btn btn-secondary" style={{ marginTop: 12 }} type="button">
                    <PlayCircle />
                    예고편 보기
                  </button>
                </a>
              )}

              <div className="hr" />

              <h4 style={{ marginBottom: 10 }}>나의 기록</h4>
              {record && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        weight={i < (record.myRating ?? 0) ? 'fill' : 'regular'}
                        color={
                          i < (record.myRating ?? 0)
                            ? 'var(--color-accent)'
                            : 'var(--color-neutral-700)'
                        }
                        style={{ cursor: 'pointer' }}
                        onClick={() => save({ myRating: i + 1 })}
                      />
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="field">
                      <label>본 횟수</label>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={record.watchCount}
                        onChange={(e) =>
                          setRecord({ ...record, watchCount: Number(e.target.value) })
                        }
                        onBlur={() => save({ watchCount: record.watchCount })}
                      />
                    </div>
                    <div className="field">
                      <label>마지막 관람일</label>
                      <input
                        className="input"
                        type="date"
                        value={record.lastWatchedAt ?? ''}
                        onChange={(e) => save({ lastWatchedAt: e.target.value || null })}
                      />
                    </div>
                    <div className="field">
                      <label>관람 매체</label>
                      <input
                        className="input"
                        value={record.watchMedium ?? ''}
                        onChange={(e) => setRecord({ ...record, watchMedium: e.target.value })}
                        onBlur={() => save({ watchMedium: record.watchMedium })}
                        placeholder="극장 / OTT / 블루레이 등"
                      />
                    </div>
                    <div className="field">
                      <label>태그</label>
                      <input
                        className="input"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        onBlur={() => save({ tags: splitTags(tagsInput) })}
                        placeholder="보고 싶음, 1번 봄"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>나의 후기</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 70 }}
                      value={record.myReview ?? ''}
                      onChange={(e) => setRecord({ ...record, myReview: e.target.value })}
                      onBlur={() => save({ myReview: record.myReview })}
                      placeholder="이 작품에 대한 생각을 기록해보세요"
                    />
                  </div>
                  {saving && (
                    <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>
                      저장 중...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
