import { Heart, Star, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { deleteBook, getBook, Book, updateUserRecord } from './api'
import { isWishlisted, withoutStatusTags } from '../../lib/wishlist'
import type { UserRecord } from '@archiedia/schema'
import { errorMessage } from '../../lib/errors'

interface Props {
  bookId: string
  onClose: () => void
  onDeleted: () => void
}

// 도서 표지가 2:3 비율이라 영화 상세팝업과 같은 고정 크기를 그대로 쓴다.
const POSTER_HEIGHT = 550
const POSTER_WIDTH = Math.round((POSTER_HEIGHT * 2) / 3)
const DIALOG_WIDTH = 913.2
const DIALOG_HEIGHT = 624

export function BookDetail({ bookId, onClose, onDeleted }: Props): React.JSX.Element {
  const [book, setBook] = useState<Book | null>(null)
  const [record, setRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on bookId change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    getBook(bookId)
      .then((result) => {
        setBook(result?.item ?? null)
        setRecord(result?.record ?? null)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [bookId])

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
    if (!book) return
    setDeleting(true)
    try {
      await deleteBook(book.id)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const meta = book?.metadata
  // 국내도서는 원제가 있어도 어차피 한글 제목과 같거나 큰 의미가 없어서 생략한다.
  const isForeign = meta?.category ? !meta.category.startsWith('국내도서') : false

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
        {!loading && !error && !book && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            책을 찾을 수 없어요.
          </div>
        )}

        {!loading && !error && book && meta && (
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
                background: book.posterUrl
                  ? `center / cover no-repeat url(${book.posterUrl})`
                  : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)'
              }}
            />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflowY: 'auto',
                paddingLeft: 2,
                paddingRight: 4,
                marginLeft: -2,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ flex: 1, minHeight: 0 }} />
              <div>
                <h2 style={{ margin: 0, paddingRight: 24 }}>{book.title}</h2>
                <div style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 4 }}>
                  {isForeign && meta.originalTitle && `${meta.originalTitle} | `}
                  {meta.author ?? '—'} | {meta.pageCount ? `${meta.pageCount}페이지` : '—'}
                </div>
                <div style={{ color: 'var(--color-neutral-300)', fontSize: 13, marginTop: 2 }}>
                  <span style={{ color: 'var(--color-neutral-500)' }}>출판</span> &nbsp;
                  {meta.publisher ?? '—'}
                  {meta.releaseYear ? `(${meta.releaseYear}년)` : ''}
                </div>
                <div style={{ color: 'var(--color-neutral-300)', fontSize: 13, marginTop: 2 }}>
                  <span style={{ color: 'var(--color-neutral-500)' }}>카테고리</span> &nbsp;
                  {meta.category ?? '—'}
                </div>
                {meta.sourceUrl && (
                  <div style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 2 }}>
                    <a
                      href={meta.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'inherit', textDecoration: 'underline' }}
                    >
                      알라딘 바로가기
                    </a>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: 'var(--color-neutral-300)'
                  }}
                >
                  <span style={{ color: 'var(--color-neutral-500)' }}>요약</span>
                  <div style={{ marginTop: 4, height: 70, overflowY: 'auto', paddingRight: 4 }}>
                    {meta.overview || '—'}
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
                        <label>읽은 횟수</label>
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
                        <label>읽은 매체</label>
                        <input
                          className="input"
                          value={record.watchMedium ?? ''}
                          onChange={(e) => setRecord({ ...record, watchMedium: e.target.value })}
                          onBlur={() => save({ watchMedium: record.watchMedium })}
                          placeholder="종이책 / eBook 등"
                        />
                      </div>
                      <div className="field">
                        <label>마지막 읽은 날</label>
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
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 13,
                    color: 'var(--color-neutral-500)',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && book && (
          <div className="dialog-backdrop" onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div
              className="dialog"
              style={{ textAlign: 'center', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-title">책 삭제</div>
              <div className="dialog-body">
                &quot;{book.title}&quot;을(를) 라이브러리에서 삭제할까요?
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
