import { CaretDown, CaretUp, Eye, Heart, Star, X } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { deleteWebtoon, getWebtoon, updateUserRecord, Webtoon } from './api'
import { isWatching, isWishlisted, withoutStatusTags } from '../../lib/wishlist'
import type { UserRecord } from '@archiedia/schema'
import { errorMessage } from '../../lib/errors'
import { normalizeGenres } from './genres'
import { webtoonPosterFill } from './poster'
import { SourceLogo } from './sourceLogo'

interface Props {
  webtoonId: string
  onClose: () => void
  onDeleted: () => void
}

// 포스터 자리는 영화/시리즈와 같은 폭을 쓰되, 네이버웹툰 썸네일 실측 비율(480×623)에
// 맞춰 높이를 다시 계산한다. 팝업 높이도 늘어난 포스터 높이에 맞춰 같은 여백
// (74px = 원래 624 - 550)을 유지한 채로 조정한다.
const POSTER_WIDTH = Math.round((550 * 2) / 3)
const POSTER_HEIGHT = Math.round((POSTER_WIDTH * 623) / 480)
const DIALOG_WIDTH = 913.2
const DIALOG_HEIGHT = POSTER_HEIGHT + 74

// 줄거리/요약 칸의 최소 높이(3줄). 평소엔 위쪽 정보량에 따라 남는 공간만큼 늘어나고,
// 위쪽이 아주 길어져도 이 아래로는 줄어들지 않는다 — 그 이상은 팝업 전체 스크롤
// (우측 컬럼의 overflowY: auto)이 대신 받아준다.
const OVERVIEW_MIN_HEIGHT = 66.3

// "나의 후기" 입력창이 딱 3줄만 보이는 높이. textarea는 box-sizing: border-box라
// 테두리(1px×2)와 안쪽 여백(6px×2)까지 포함해서 계산해야 정확히 3줄이 된다.
// (본문 14px × line-height 1.55 × 3줄 + 테두리 2px + 안쪽 여백 12px)
const REVIEW_HEIGHT = 79.1

// 카카오웹툰은 해시태그를 "#로맨스"처럼 #을 붙여서 주고 네이버웹툰은 안 붙여서 준다.
// 표기를 맞추려고 화면에 그릴 때 떼어낸다. (이미 보관된 항목에도 바로 적용된다)
function stripHash(tag: string): string {
  return tag.replace(/^#/, '')
}

// 상세팝업 레이아웃은 당분간 영화(MovieDetail)와 동일한 틀을 쓰되, 웹툰에 맞는 필드
// 구성(작가·장르·연재상태, 해시태그, 줄거리, 원본링크)으로 맞췄다.
export function WebtoonDetail({ webtoonId, onClose, onDeleted }: Props): React.JSX.Element {
  const [webtoon, setWebtoon] = useState<Webtoon | null>(null)
  const [record, setRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [overviewExpanded, setOverviewExpanded] = useState(false)
  const [overviewOverflows, setOverviewOverflows] = useState(false)
  const overviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on webtoonId change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    setOverviewExpanded(false)
    getWebtoon(webtoonId)
      .then((result) => {
        setWebtoon(result?.item ?? null)
        setRecord(result?.record ?? null)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [webtoonId])

  // 접힌 상태 기준으로 줄거리가 실제로 잘리는지 측정해서, 안 잘리면 펼치기 화살표
  // 자체를 감춘다. (펼쳐진 뒤에는 다시 측정하지 않는다 — 잘리지 않던 텍스트는 계속
  // 잘리지 않는다)
  useLayoutEffect(() => {
    const el = overviewRef.current
    if (!el) return
    setOverviewOverflows(el.scrollHeight > el.clientHeight + 1)
  }, [webtoon])

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
    if (!webtoon) return
    setDeleting(true)
    try {
      await deleteWebtoon(webtoon.id)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const meta = webtoon?.metadata

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
        {!loading && !error && !webtoon && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            웹툰을 찾을 수 없어요.
          </div>
        )}

        {!loading && !error && webtoon && meta && (
          <div style={{ display: 'flex', gap: 36, height: '100%', minHeight: 0 }}>
            <div
              style={{
                width: POSTER_WIDTH,
                height: POSTER_HEIGHT,
                alignSelf: 'center',
                flex: 'none',
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
                ...webtoonPosterFill(webtoon.posterUrl, meta.backgroundImageUrl)
              }}
            >
              <SourceLogo
                source={webtoon.source}
                size={32}
                style={{ position: 'absolute', top: 10, left: 10 }}
              />
            </div>
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
                // "나의 후기" 입력창이 이 컬럼의 맨 아래(포스터 하단선)에 바로 붙어 있어서,
                // 포커스 시 바깥쪽으로 2px 그려지는 포커스 링(outline-offset: 0)이 이
                // overflow 경계에 잘린다. 그만큼만 여유를 둔다.
                paddingBottom: 3,
                marginLeft: -2,
                marginRight: -10.6,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div>
                <h2 style={{ margin: 0, paddingRight: 24, fontSize: 26 }}>{webtoon.title}</h2>
                <div style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 4 }}>
                  {meta.author ?? '—'} · {normalizeGenres(meta.genres).join(', ') || '—'} |{' '}
                  {meta.totalEpisodes ? `${meta.totalEpisodes}화 ` : ''}
                  {meta.isFinished ? '완결' : '연재 중'}
                  {meta.sourceUrl && (
                    <>
                      {' '}
                      |{' '}
                      <a
                        href={meta.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'inherit', textDecoration: 'underline' }}
                      >
                        바로가기
                      </a>
                    </>
                  )}
                </div>
                {meta.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {meta.tags.slice(0, 10).map((tag) => (
                      <span key={tag} className="tag tag-neutral">
                        {stripHash(tag)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 접혀 있을 땐 flex:1로 위쪽 정보량에 따라 남는 공간만큼만 늘어나서(최소
                  OVERVIEW_MIN_HEIGHT) 아래 개인 기록 영역이 항상 포스터 하단 라인에
                  맞춰진다. 화살표를 눌러 펼치면 그 제약을 없애 전체 텍스트를 그대로
                  보여주고, 대신 컬럼 전체(overflowY: auto)가 스크롤된다. */}
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  ...(overviewExpanded ? {} : { flex: 1, minHeight: OVERVIEW_MIN_HEIGHT })
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ color: 'var(--color-neutral-500)', fontSize: 13 }}>줄거리</span>
                  {overviewOverflows && (
                    <button
                      type="button"
                      onClick={() => setOverviewExpanded((v) => !v)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        padding: 2,
                        color: 'var(--color-neutral-500)',
                        cursor: 'pointer'
                      }}
                    >
                      {overviewExpanded ? (
                        <CaretUp size={14} weight="bold" style={{ display: 'block' }} />
                      ) : (
                        <CaretDown size={14} weight="bold" style={{ display: 'block' }} />
                      )}
                    </button>
                  )}
                </div>
                <div
                  ref={overviewRef}
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: 'var(--color-neutral-300)',
                    ...(overviewExpanded ? {} : { flex: 1, minHeight: 0, overflow: 'hidden' })
                  }}
                >
                  {meta.overview || '—'}
                </div>
              </div>

              <div>
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
                        <label>읽은 매체</label>
                        <input
                          className="input"
                          value={record.watchMedium ?? ''}
                          onChange={(e) => setRecord({ ...record, watchMedium: e.target.value })}
                          onBlur={() => save({ watchMedium: record.watchMedium })}
                          placeholder="네이버웹툰 앱 / PC 등"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        // 마지막 읽은 날 칸이 위 행(3등분)의 칸 하나와 정확히 같은 너비가
                        // 되도록, fr 대신 그 행과 같은 계산식을 그대로 옮겨 쓴다.
                        gridTemplateColumns: '1fr calc((100% - 20px) / 3)',
                        gap: 10
                      }}
                    >
                      <div className="field">
                        <label>상태</label>
                        <div style={{ display: 'flex' }}>
                          <button
                            type="button"
                            className={
                              isWishlisted(record.tags) ? 'btn btn-primary' : 'btn btn-secondary'
                            }
                            style={{
                              flex: 1,
                              minHeight: 36,
                              borderTopRightRadius: 0,
                              borderBottomRightRadius: 0
                            }}
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
                          <button
                            type="button"
                            className={
                              isWatching(record.tags) ? 'btn btn-primary' : 'btn btn-secondary'
                            }
                            style={{
                              flex: 1,
                              minHeight: 36,
                              marginLeft: -1,
                              borderTopLeftRadius: 0,
                              borderBottomLeftRadius: 0
                            }}
                            onClick={() =>
                              save({
                                tags: isWatching(record.tags)
                                  ? withoutStatusTags(record.tags)
                                  : [...withoutStatusTags(record.tags), '보는 중']
                              })
                            }
                          >
                            <Eye weight={isWatching(record.tags) ? 'fill' : 'regular'} />
                            보는 중
                          </button>
                        </div>
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
                        // 전역 CSS(textarea.input)의 min-height: 90px가 height보다 우선
                        // 적용돼서 minHeight도 같이 덮어써야 실제로 줄어든다.
                        style={{ resize: 'none', height: REVIEW_HEIGHT, minHeight: REVIEW_HEIGHT }}
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

        {!loading && !error && webtoon && meta && (
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

        {showDeleteConfirm && webtoon && (
          <div className="dialog-backdrop" onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div
              className="dialog"
              style={{ textAlign: 'center', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-title">웹툰 삭제</div>
              <div className="dialog-body">
                &quot;{webtoon.title}&quot;을(를) 보관함에서 삭제할까요?
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
