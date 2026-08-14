import { Heart, PlayCircle, Star, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { deleteMovie, getMovie, Movie, updateUserRecord } from './api'
import { isWishlisted, withoutStatusTags } from '../../lib/wishlist'
import type { UserRecord } from '@archiedia/schema'
import { errorMessage } from '../../lib/errors'

interface Props {
  movieId: string
  onClose: () => void
  onDeleted: () => void
}

// 포스터는 항상 이 고정 크기로 그린다. 콘텐츠 높이에 맞춰 유동적으로 그리면(이전 방식)
// 측정 전/후로 크기가 바뀌며 텍스트 줄바꿈이 깜빡이거나, 짧은 콘텐츠일 때 좌우에 빈
// 여백이 남는 문제가 있었다. 고정 크기는 두 문제 모두 원천적으로 없앤다.
const POSTER_HEIGHT = 550
const POSTER_WIDTH = Math.round((POSTER_HEIGHT * 2) / 3)
const DIALOG_WIDTH = 913.2
const DIALOG_HEIGHT = 624

// 줄거리/요약 칸은 네 상세팝업 모두 딱 세 줄이 보이는 같은 높이를 쓴다.
// (본문 13px × line-height 1.7 × 3줄)
const OVERVIEW_HEIGHT = 66.3

export function MovieDetail({ movieId, onClose, onDeleted }: Props): React.JSX.Element {
  const [movie, setMovie] = useState<Movie | null>(null)
  const [record, setRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on movieId change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    getMovie(movieId)
      .then((result) => {
        setMovie(result?.item ?? null)
        setRecord(result?.record ?? null)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [movieId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false)
      } else {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, showDeleteConfirm])

  async function save(patch: Partial<UserRecord>): Promise<void> {
    if (!record) return
    try {
      await updateUserRecord(record.id, patch)
      setRecord({ ...record, ...patch })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!movie) return
    setDeleting(true)
    try {
      await deleteMovie(movie.id)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err))
      setDeleting(false)
      setShowDeleteConfirm(false)
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
          paddingLeft: 33.6,
          paddingRight: 29.6,
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
          <div style={{ display: 'flex', gap: 36, height: '100%', minHeight: 0 }}>
            <div
              style={{
                width: POSTER_WIDTH,
                height: POSTER_HEIGHT,
                alignSelf: 'center',
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
                height: POSTER_HEIGHT,
                alignSelf: 'center',
                overflowY: 'auto',
                // 스크롤바 유무로 본문 너비가 달라지지 않도록 항상 자리를 비워둔다.
                scrollbarGutter: 'stable',
                paddingLeft: 2,
                // 스크롤바(8px)가 우측 상단 X 버튼(중심이 팝업 오른쪽 끝에서 23px) 바로
                // 아래에 오도록 컨테이너를 팝업 여백까지 넓히고(-10.6), 같은 양만큼
                // 패딩을 늘려 본문 자체의 위치는 그대로 유지한다.
                paddingRight: 14.6,
                marginLeft: -2,
                marginRight: -10.6,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div>
                <h2 style={{ margin: 0, paddingRight: 24, fontSize: 26 }}>{movie.title}</h2>
                <div style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 4 }}>
                  {meta.originalTitle ?? movie.title} · {meta.releaseYear ?? '—'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginTop: 12
                  }}
                >
                  {meta.genres.map((g) => (
                    <span key={g} className="tag tag-neutral">
                      {g}
                    </span>
                  ))}
                  {meta.runtimeMinutes && (
                    <span className="tag tag-outline">{meta.runtimeMinutes}분</span>
                  )}
                  {meta.country && <span className="tag tag-outline">{meta.country}</span>}
                  {meta.trailerUrl && (
                    // 다른 태그와 박스가 정확히 같아야 해서 button 대신 a에 직접 .tag를 준다.
                    // button은 UA 기본 스타일(폰트/패딩/박스사이징) 때문에 높이가 미세하게 어긋난다.
                    <a
                      className="tag tag-outline"
                      href={meta.trailerUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ gap: 4, textDecoration: 'none', cursor: 'pointer' }}
                    >
                      <PlayCircle size={12} style={{ display: 'block' }} />
                      예고편 보기
                    </a>
                  )}
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
                  <div style={{ marginTop: 8 }}>
                    <span style={{ color: 'var(--color-neutral-500)' }}>줄거리</span>
                    <div
                      style={{
                        marginTop: 4,
                        height: OVERVIEW_HEIGHT,
                        overflowY: 'auto',
                        paddingRight: 4
                      }}
                    >
                      {meta.overview || '—'}
                    </div>
                  </div>
                </div>

                <div className="hr" />

                {record && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div className="field">
                        <label>평점</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 36 }}>
                          {Array.from({ length: 5 }).map((_, i) => {
                            const fill = Math.max(0, Math.min(1, (record.myRating ?? 0) - i))
                            return (
                              <div
                                key={i}
                                style={{
                                  position: 'relative',
                                  width: 18,
                                  height: 18,
                                  cursor: 'pointer'
                                }}
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  const half = e.clientX - rect.left < rect.width / 2
                                  save({ myRating: i + (half ? 0.5 : 1) })
                                }}
                              >
                                <Star
                                  size={18}
                                  weight="fill"
                                  color="var(--color-neutral-700)"
                                  style={{ position: 'absolute', top: 0, left: 0 }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: 18,
                                    overflow: 'hidden',
                                    width: fill * 18
                                  }}
                                >
                                  <Star
                                    size={18}
                                    weight="fill"
                                    color="var(--color-accent)"
                                    style={{ position: 'absolute', top: 0, left: 0 }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="field">
                        <label>시청 횟수</label>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          style={{ MozAppearance: 'textfield' }}
                          value={record.watchCount === 0 ? '' : record.watchCount}
                          placeholder="0"
                          onChange={(e) =>
                            setRecord({ ...record, watchCount: Number(e.target.value) || 0 })
                          }
                          onBlur={() => save({ watchCount: record.watchCount })}
                        />
                      </div>
                      <div className="field">
                        <label>상태</label>
                        <button
                          type="button"
                          className={
                            isWishlisted(record.tags) ? 'btn btn-primary' : 'btn btn-secondary'
                          }
                          style={{ width: '100%', minHeight: 36 }}
                          onClick={() =>
                            save({
                              tags: isWishlisted(record.tags)
                                ? withoutStatusTags(record.tags)
                                : [...withoutStatusTags(record.tags), '보고 싶음']
                            })
                          }
                        >
                          <Heart weight={isWishlisted(record.tags) ? 'fill' : 'regular'} />
                          보고 싶어요
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="field">
                        <label>시청 매체</label>
                        <input
                          className="input"
                          value={record.watchMedium ?? ''}
                          onChange={(e) => setRecord({ ...record, watchMedium: e.target.value })}
                          onBlur={() => save({ watchMedium: record.watchMedium })}
                          placeholder="극장 / OTT / 블루레이 등"
                        />
                      </div>
                      <div className="field">
                        <label>마지막 시청일</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="YYYY-MM-DD"
                          value={record.lastWatchedAt ?? ''}
                          onChange={(e) =>
                            setRecord({ ...record, lastWatchedAt: e.target.value || null })
                          }
                          onBlur={() => save({ lastWatchedAt: record.lastWatchedAt })}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && movie && meta && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              position: 'absolute',
              bottom: 8,
              right: 33.6,
              background: 'none',
              border: 'none',
              padding: 6,
              fontSize: 13,
              color: 'var(--color-neutral-500)',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            삭제
          </button>
        )}

        {showDeleteConfirm && movie && (
          <div className="dialog-backdrop" onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div
              className="dialog"
              style={{ textAlign: 'center', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-title">영화 삭제</div>
              <div className="dialog-body">
                &quot;{movie.title}&quot;을(를) 라이브러리에서 삭제할까요?
              </div>
              <div className="dialog-actions" style={{ justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={deleting}
                  onClick={confirmDelete}
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
