import { CaretDown, CaretUp, Eye, Heart, PlayCircle, Star, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { deleteSeries, getSeries, Series, updateUserRecord } from './api'
import { EditSeasonModal } from './EditSeasonModal'
import { isWatching, isWishlisted, withoutStatusTags } from '../../lib/wishlist'
import type { DramaSeasonMetadata, UserRecord } from '@archiedia/schema'
import { errorMessage } from '../../lib/errors'

interface Props {
  seriesId: string
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

// 줄거리/요약 칸의 최소 높이(3줄). 평소엔 위쪽 정보량에 따라 남는 공간만큼 늘어나고,
// 위쪽이 아주 길어져도 이 아래로는 줄어들지 않는다 — 그 이상은 팝업 전체 스크롤
// (우측 컬럼의 overflowY: auto)이 대신 받아준다.
const OVERVIEW_MIN_HEIGHT = 66.3

function seasonLabel(season: DramaSeasonMetadata): string {
  return `시즌 ${season.seasonNumber}`
}

// 다른 태그와 박스가 정확히 같아야 해서 button 대신 a에 직접 .tag를 준다.
// button은 UA 기본 스타일(폰트/패딩/박스사이징) 때문에 높이가 미세하게 어긋난다.
function TrailerTag({ url }: { url: string }): React.JSX.Element {
  return (
    <a
      className="tag tag-neutral"
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{ gap: 4, textDecoration: 'none', cursor: 'pointer' }}
    >
      <PlayCircle size={12} style={{ display: 'block' }} />
      예고편 보기
    </a>
  )
}

function SeasonSelect({
  seasons,
  selectedIndex,
  onSelect
}: {
  seasons: DramaSeasonMetadata[]
  selectedIndex: number
  onSelect: (index: number) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="tag tag-outline"
        onClick={() => setOpen((o) => !o)}
        style={{ cursor: 'pointer', width: 70, justifyContent: 'space-between' }}
      >
        {seasonLabel(seasons[selectedIndex])}
        <CaretDown size={9} style={{ display: 'block' }} />
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 10,
            width: '100%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 6
          }}
        >
          {seasons.map((season, i) => (
            <div
              key={season.seasonNumber}
              onClick={() => {
                onSelect(i)
                setOpen(false)
              }}
              style={{
                padding: '5px 8px',
                fontSize: 11,
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                color: i === selectedIndex ? 'var(--color-accent)' : undefined
              }}
            >
              {seasonLabel(season)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 상세팝업 레이아웃은 당분간 영화(MovieDetail)와 동일하게 맞춰뒀다. 시리즈 전용
// 레이아웃으로 바뀌면 이 파일도 함께 손볼 것.
export function SeriesDetail({ seriesId, onClose, onDeleted }: Props): React.JSX.Element {
  const [series, setSeries] = useState<Series | null>(null)
  const [record, setRecord] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [overviewExpanded, setOverviewExpanded] = useState(false)
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on seriesId change needs to reset the loading/error flags before the async call resolves
    setLoading(true)
    setError(null)
    setSelectedSeasonIndex(0)
    setOverviewExpanded(false)
    getSeries(seriesId)
      .then((result) => {
        setSeries(result?.item ?? null)
        setRecord(result?.record ?? null)
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [seriesId])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false)
      } else if (showEditModal) {
        setShowEditModal(false)
      } else {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, showDeleteConfirm, showEditModal])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 시즌을 바꾸면 그 시즌의 줄거리가 바뀌므로 펼침 상태를 초기화한다
    setOverviewExpanded(false)
  }, [selectedSeasonIndex])

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
    if (!series) return
    setDeleting(true)
    try {
      await deleteSeries(series.id)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const meta = series?.metadata
  const seasons = meta?.seasons ?? []
  const isMultiSeason = seasons.length >= 2
  const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodeCount, 0)
  const selectedSeason = seasons[selectedSeasonIndex] ?? null

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
        {!loading && !error && !series && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            시리즈를 찾을 수 없어요.
          </div>
        )}

        {!loading && !error && series && meta && (
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
                background: series.posterUrl
                  ? `center / cover no-repeat url(${series.posterUrl})`
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
                <h2 style={{ margin: 0, paddingRight: 24, fontSize: 26 }}>{series.title}</h2>
                <div style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 4 }}>
                  {meta.releaseYear ?? '—'} · {meta.genres.join(', ') || '—'}
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
                  {meta.country && <span className="tag tag-outline">{meta.country}</span>}
                  {isMultiSeason && (
                    <span className="tag tag-outline">시즌 {seasons.length}개</span>
                  )}
                  {totalEpisodes > 0 && <span className="tag tag-outline">{totalEpisodes}부</span>}
                  {!isMultiSeason && selectedSeason?.runtimeMinutes && (
                    <span className="tag tag-outline">{selectedSeason.runtimeMinutes}분</span>
                  )}
                  {isMultiSeason && (
                    <>
                      <SeasonSelect
                        seasons={seasons}
                        selectedIndex={selectedSeasonIndex}
                        onSelect={setSelectedSeasonIndex}
                      />
                      {selectedSeason && (
                        <span className="tag tag-outline">{selectedSeason.episodeCount}부</span>
                      )}
                    </>
                  )}
                  {selectedSeason?.trailerUrl && <TrailerTag url={selectedSeason.trailerUrl} />}
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
                    {selectedSeason?.director ?? '—'}
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500)' }}>출연</span> &nbsp;
                    {selectedSeason?.actors.length ? selectedSeason.actors.join(', ') : '—'}
                  </div>
                </div>
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
                    {overviewExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: 'var(--color-neutral-300)',
                    ...(overviewExpanded ? {} : { flex: 1, minHeight: 0, overflow: 'hidden' })
                  }}
                >
                  {selectedSeason?.overview || '—'}
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
                        <label>시청 매체</label>
                        <input
                          className="input"
                          value={record.watchMedium ?? ''}
                          onChange={(e) => setRecord({ ...record, watchMedium: e.target.value })}
                          onBlur={() => save({ watchMedium: record.watchMedium })}
                          placeholder="극장 / OTT / 블루레이 등"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        // 마지막 시청일 칸이 위 행(3등분)의 칸 하나와 정확히 같은 너비가
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
                        style={{ resize: 'none' }}
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

        {!loading && !error && series && meta && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 33.6,
              display: 'flex',
              alignItems: 'center',
              gap: 14
            }}
          >
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                fontSize: 13,
                color: 'var(--color-neutral-500)',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
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
          </div>
        )}

        {showEditModal && series && (
          <EditSeasonModal
            series={series}
            seasonIndex={selectedSeasonIndex}
            onClose={() => setShowEditModal(false)}
            onSaved={(updated) => {
              setSeries(updated)
              setShowEditModal(false)
            }}
          />
        )}

        {showDeleteConfirm && series && (
          <div className="dialog-backdrop" onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div
              className="dialog"
              style={{ textAlign: 'center', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-title">시리즈 삭제</div>
              <div className="dialog-body">
                &quot;{series.title}&quot;을(를) 보관함에서 삭제할까요?
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
