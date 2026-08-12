import { ArrowLeft, PlayCircle, Star } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getMovie, Movie, updateUserRecord } from './api'
import type { UserRecord } from '@archiedia/schema'
import { errorMessage } from '../../lib/errors'

interface Props {
  movieId: string
  onBack: () => void
}

const POSTER_FALLBACK_HEIGHT = 420

// 오른쪽 정보 컬럼의 실제 렌더링 높이를 측정해서 포스터 높이를 거기에 맞춘다.
// (align-items:stretch + aspect-ratio만으로는 크기가 0으로 붕괴하는 문제가 있어 JS로 측정)
// 콜백 ref를 쓰는 이유: 로딩 중엔 이 div 자체가 렌더링되지 않아서, 마운트 시점에 한 번만
// 도는 일반 useEffect + useRef 조합으로는 로딩이 끝나고 실제로 div가 나타나는 순간을 놓친다.
function useElementHeight(): [(el: HTMLDivElement | null) => void, number] {
  const [height, setHeight] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    if (!el) return

    setHeight(el.clientHeight)
    const observer = new ResizeObserver(() => setHeight(el.clientHeight))
    observer.observe(el)
    observerRef.current = observer
  }, [])

  return [ref, height]
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function MovieDetail({ movieId, onBack }: Props): React.JSX.Element {
  const [movie, setMovie] = useState<Movie | null>(null)
  const [record, setRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [infoRef, infoHeight] = useElementHeight()

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

  if (loading)
    return <div style={{ padding: 32, color: 'var(--color-neutral-500)' }}>불러오는 중...</div>
  if (error) return <div style={{ padding: 32, color: '#e08a8a' }}>{error}</div>
  if (!movie) return <div style={{ padding: 32 }}>영화를 찾을 수 없어요.</div>

  const meta = movie.metadata

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 32px 40px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft />
        라이브러리로
      </button>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div
          style={{
            height: infoHeight || POSTER_FALLBACK_HEIGHT,
            aspectRatio: '2 / 3',
            flex: 'none',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            background: movie.posterUrl
              ? `center / cover no-repeat url(${movie.posterUrl})`
              : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)'
          }}
        />
        <div ref={infoRef} style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>{movie.title}</h1>
          <div style={{ color: 'var(--color-neutral-500)', fontSize: 14, marginTop: 4 }}>
            {meta.originalTitle ?? movie.title} · {meta.releaseYear ?? '—'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
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
              marginTop: 18,
              fontSize: 13.5,
              lineHeight: 1.9,
              color: 'var(--color-neutral-300)'
            }}
          >
            <div>
              <span style={{ color: 'var(--color-neutral-500)' }}>감독</span> &nbsp;{' '}
              {meta.director ?? '—'}
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral-500)' }}>출연</span> &nbsp;
              {meta.actors.length ? meta.actors.join(', ') : '—'}
            </div>
          </div>
          {meta.trailerUrl && (
            <a href={meta.trailerUrl} target="_blank" rel="noreferrer">
              <button className="btn btn-secondary" style={{ marginTop: 14 }} type="button">
                <PlayCircle />
                예고편 보기
              </button>
            </a>
          )}

          <div className="hr" />

          <h4 style={{ marginBottom: 12 }}>나의 기록</h4>
          {record && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={20}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>본 횟수</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={record.watchCount}
                    onChange={(e) => setRecord({ ...record, watchCount: Number(e.target.value) })}
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
                  value={record.myReview ?? ''}
                  onChange={(e) => setRecord({ ...record, myReview: e.target.value })}
                  onBlur={() => save({ myReview: record.myReview })}
                  placeholder="이 작품에 대한 생각을 기록해보세요"
                />
              </div>
              {saving && (
                <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>저장 중...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
