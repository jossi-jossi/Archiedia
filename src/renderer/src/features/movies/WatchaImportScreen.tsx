import { useRef, useState } from 'react'
import { csvRowsToObjects, parseCsv } from '../../lib/csv'
import { errorMessage } from '../../lib/errors'
import { getWebtoonDetails, searchWebtoons } from '../../lib/naverWebtoon'
import { getMovieDetails, getTvDetails, searchMovies, searchTv } from '../../lib/tmdb'
import { createMovie, getArchivedTmdbIds } from './api'
import { createSeries, getArchivedTmdbTvIds } from '../series/api'
import { createWebtoon, getArchivedWebtoonIds } from '../webtoons/api'

interface Props {
  onImported: () => void
}

interface WatchaRow {
  title: string
  year: number | null
  rating: number | null
  review: string | null
  watchedAt: string | null
}

interface ImportResult {
  matched: number
  duplicate: number
  unmatched: { title: string; year: number | null }[]
  failed: { title: string; error: string }[]
}

// 왓챠 내보내기 스크립트는 시청일 기록이 없는 항목에 유닉스 타임스탬프 0(1970-01-01)을
// 채워 넣는다. 실제 시청일이 아니라 "기록 없음"을 뜻하므로 null로 취급한다.
const WATCHA_EMPTY_DATE = '1970-01-01'

function parseWatchaRows(text: string, type: 'MOVIE' | 'TV' | 'WEBTOON'): WatchaRow[] {
  const objects = csvRowsToObjects(parseCsv(text))
  return objects
    .filter((row) => (row.Type ?? '').trim().toUpperCase() === type)
    .map((row) => {
      const watchedAt = row.WatchedAt?.trim() || null
      return {
        title: (row.Title ?? '').trim(),
        year: row.Year && !Number.isNaN(Number(row.Year)) ? Number(row.Year) : null,
        rating: row.Rating && !Number.isNaN(Number(row.Rating)) ? Number(row.Rating) : null,
        review: row.Review?.trim() || null,
        watchedAt: watchedAt === WATCHA_EMPTY_DATE ? null : watchedAt
      }
    })
    .filter((row) => row.title)
}

function ImportResultView({
  result,
  sourceName
}: {
  result: ImportResult
  sourceName: string
}): React.JSX.Element {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 14 }}>
        매칭 성공 {result.matched}개 · 이미 보관됨 {result.duplicate}개 · 매칭 실패{' '}
        {result.unmatched.length}개{result.failed.length > 0 && ` · 오류 ${result.failed.length}개`}
      </div>

      {result.unmatched.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-500)', marginBottom: 6 }}>
            {sourceName}에서 못 찾은 작품 (검색·추가에서 직접 찾아보세요)
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
            {result.unmatched.map((u, i) => (
              <li key={i}>
                {u.title} {u.year ? `(${u.year})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.failed.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: '#e08a8a', marginBottom: 6 }}>
            가져오는 중 오류가 발생한 작품
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
            {result.failed.map((f, i) => (
              <li key={i}>
                {f.title} — {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function WatchaImportScreen({ onImported }: Props): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [movieRows, setMovieRows] = useState<WatchaRow[] | null>(null)
  const [seriesRows, setSeriesRows] = useState<WatchaRow[] | null>(null)
  const [webtoonRows, setWebtoonRows] = useState<WatchaRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [movieImporting, setMovieImporting] = useState(false)
  const [movieProgress, setMovieProgress] = useState(0)
  const [movieResult, setMovieResult] = useState<ImportResult | null>(null)

  const [seriesImporting, setSeriesImporting] = useState(false)
  const [seriesProgress, setSeriesProgress] = useState(0)
  const [seriesResult, setSeriesResult] = useState<ImportResult | null>(null)

  const [webtoonImporting, setWebtoonImporting] = useState(false)
  const [webtoonProgress, setWebtoonProgress] = useState(0)
  const [webtoonResult, setWebtoonResult] = useState<ImportResult | null>(null)

  function handleFile(file: File): void {
    setError(null)
    setMovieResult(null)
    setSeriesResult(null)
    setWebtoonResult(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        setMovieRows(parseWatchaRows(text, 'MOVIE'))
        setSeriesRows(parseWatchaRows(text, 'TV'))
        setWebtoonRows(parseWatchaRows(text, 'WEBTOON'))
      } catch (err) {
        setError(errorMessage(err))
        setMovieRows(null)
        setSeriesRows(null)
        setWebtoonRows(null)
      }
    }
    reader.onerror = () => setError('파일을 읽지 못했어요.')
    reader.readAsText(file)
  }

  async function startMovieImport(): Promise<void> {
    if (!movieRows || movieRows.length === 0) return
    setMovieImporting(true)
    setMovieProgress(0)
    setError(null)

    const archivedIds = await getArchivedTmdbIds()
    const summary: ImportResult = { matched: 0, duplicate: 0, unmatched: [], failed: [] }

    for (let i = 0; i < movieRows.length; i++) {
      const row = movieRows[i]
      setMovieProgress(i + 1)
      try {
        const results = await searchMovies(row.title)
        const match =
          (row.year && results.find((r) => r.year === row.year)) ??
          (results.length === 1 ? results[0] : null)

        if (!match) {
          summary.unmatched.push({ title: row.title, year: row.year })
          continue
        }
        if (archivedIds.has(String(match.id))) {
          summary.duplicate++
          continue
        }

        const details = await getMovieDetails(match.id)
        await createMovie({
          title: details.title,
          posterUrl: details.posterUrl,
          externalId: String(match.id),
          metadata: details.metadata,
          initialRecord: {
            myRating: row.rating,
            myReview: row.review,
            watchCount: 1,
            lastWatchedAt: row.watchedAt
          }
        })
        archivedIds.add(String(match.id))
        summary.matched++
      } catch (err) {
        summary.failed.push({ title: row.title, error: errorMessage(err) })
      }
    }

    setMovieResult(summary)
    setMovieImporting(false)
    if (summary.matched > 0) onImported()
  }

  async function startSeriesImport(): Promise<void> {
    if (!seriesRows || seriesRows.length === 0) return
    setSeriesImporting(true)
    setSeriesProgress(0)
    setError(null)

    const archivedIds = await getArchivedTmdbTvIds()
    const summary: ImportResult = { matched: 0, duplicate: 0, unmatched: [], failed: [] }

    for (let i = 0; i < seriesRows.length; i++) {
      const row = seriesRows[i]
      setSeriesProgress(i + 1)
      try {
        const results = await searchTv(row.title)
        const match =
          (row.year && results.find((r) => r.year === row.year)) ??
          (results.length === 1 ? results[0] : null)

        if (!match) {
          summary.unmatched.push({ title: row.title, year: row.year })
          continue
        }
        if (archivedIds.has(String(match.id))) {
          summary.duplicate++
          continue
        }

        const details = await getTvDetails(match.id)
        await createSeries({
          title: details.title,
          posterUrl: details.posterUrl,
          externalId: String(match.id),
          metadata: details.metadata,
          initialRecord: {
            myRating: row.rating,
            myReview: row.review,
            watchCount: 1,
            lastWatchedAt: row.watchedAt
          }
        })
        archivedIds.add(String(match.id))
        summary.matched++
      } catch (err) {
        summary.failed.push({ title: row.title, error: errorMessage(err) })
      }
    }

    setSeriesResult(summary)
    setSeriesImporting(false)
    if (summary.matched > 0) onImported()
  }

  // 웹툰은 왓챠 CSV에 연도 정보가 딱히 의미가 없어서 제목만으로 매칭한다.
  async function startWebtoonImport(): Promise<void> {
    if (!webtoonRows || webtoonRows.length === 0) return
    setWebtoonImporting(true)
    setWebtoonProgress(0)
    setError(null)

    const archivedIds = await getArchivedWebtoonIds('naver')
    const summary: ImportResult = { matched: 0, duplicate: 0, unmatched: [], failed: [] }

    for (let i = 0; i < webtoonRows.length; i++) {
      const row = webtoonRows[i]
      setWebtoonProgress(i + 1)
      try {
        const results = await searchWebtoons(row.title)
        const match =
          results.find((r) => r.title === row.title) ?? (results.length === 1 ? results[0] : null)

        if (!match) {
          summary.unmatched.push({ title: row.title, year: row.year })
          continue
        }
        if (archivedIds.has(String(match.id))) {
          summary.duplicate++
          continue
        }

        const details = await getWebtoonDetails(match.id)
        await createWebtoon({
          title: details.title,
          posterUrl: details.posterUrl,
          externalId: String(match.id),
          source: 'naver',
          metadata: details.metadata,
          initialRecord: {
            myRating: row.rating,
            myReview: row.review,
            watchCount: 1,
            lastWatchedAt: row.watchedAt
          }
        })
        archivedIds.add(String(match.id))
        summary.matched++
      } catch (err) {
        summary.failed.push({ title: row.title, error: errorMessage(err) })
      }
    }

    setWebtoonResult(summary)
    setWebtoonImporting(false)
    if (summary.matched > 0) onImported()
  }

  const importing = movieImporting || seriesImporting || webtoonImporting

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 24, maxWidth: 640 }}>
      <h2 style={{ margin: 0 }}>왓챠피디아에서 가져오기</h2>
      <p style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 6 }}>
        왓챠피디아 평가 데이터를 내보낸 CSV 파일을 선택하면, 영화(Type=MOVIE)·시리즈(Type=TV)·
        웹툰(Type=WEBTOON) 항목을 각각 찾아 라이브러리에 추가해요. 영화·시리즈는 제목/연도가, 웹툰은
        제목만 일치하는 항목을 매칭하고, 못 찾은 작품은 아래에 목록으로 보여드려요.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          CSV 파일 선택
        </button>
        {fileName && (
          <span style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>{fileName}</span>
        )}
      </div>

      {error && <div style={{ color: '#e08a8a', fontSize: 13, marginTop: 12 }}>{error}</div>}

      {movieRows && (
        <div style={{ marginTop: 20 }}>
          <div className="hr" />
          <h4 style={{ margin: 0 }}>영화</h4>
          {!movieResult && (
            <>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-500)', marginTop: 8 }}>
                영화 {movieRows.length}개를 찾았어요.
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                disabled={importing || movieRows.length === 0}
                onClick={startMovieImport}
              >
                {movieImporting
                  ? `가져오는 중... (${movieProgress}/${movieRows.length})`
                  : '영화 가져오기 시작'}
              </button>
            </>
          )}
          {movieResult && <ImportResultView result={movieResult} sourceName="TMDB" />}
        </div>
      )}

      {seriesRows && (
        <div style={{ marginTop: 20 }}>
          <div className="hr" />
          <h4 style={{ margin: 0 }}>시리즈</h4>
          {!seriesResult && (
            <>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-500)', marginTop: 8 }}>
                시리즈 {seriesRows.length}개를 찾았어요.
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                disabled={importing || seriesRows.length === 0}
                onClick={startSeriesImport}
              >
                {seriesImporting
                  ? `가져오는 중... (${seriesProgress}/${seriesRows.length})`
                  : '시리즈 가져오기 시작'}
              </button>
            </>
          )}
          {seriesResult && <ImportResultView result={seriesResult} sourceName="TMDB" />}
        </div>
      )}

      {webtoonRows && (
        <div style={{ marginTop: 20 }}>
          <div className="hr" />
          <h4 style={{ margin: 0 }}>웹툰</h4>
          {!webtoonResult && (
            <>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-500)', marginTop: 8 }}>
                웹툰 {webtoonRows.length}개를 찾았어요.
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                disabled={importing || webtoonRows.length === 0}
                onClick={startWebtoonImport}
              >
                {webtoonImporting
                  ? `가져오는 중... (${webtoonProgress}/${webtoonRows.length})`
                  : '웹툰 가져오기 시작'}
              </button>
            </>
          )}
          {webtoonResult && <ImportResultView result={webtoonResult} sourceName="네이버웹툰" />}
        </div>
      )}
    </div>
  )
}
