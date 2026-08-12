import { useRef, useState } from 'react'
import { csvRowsToObjects, parseCsv } from '../../lib/csv'
import { errorMessage } from '../../lib/errors'
import { getMovieDetails, searchMovies } from '../../lib/tmdb'
import { createMovie, getArchivedTmdbIds } from './api'

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

function parseWatchaRows(text: string): WatchaRow[] {
  const objects = csvRowsToObjects(parseCsv(text))
  return objects
    .filter((row) => (row.Type ?? '').trim().toUpperCase() === 'MOVIE')
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

export function WatchaImportScreen({ onImported }: Props): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<WatchaRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File): void {
    setError(null)
    setResult(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseWatchaRows(String(reader.result ?? ''))
        setRows(parsed)
      } catch (err) {
        setError(errorMessage(err))
        setRows(null)
      }
    }
    reader.onerror = () => setError('파일을 읽지 못했어요.')
    reader.readAsText(file)
  }

  async function startImport(): Promise<void> {
    if (!rows || rows.length === 0) return
    setImporting(true)
    setProgress(0)
    setError(null)

    const archivedIds = await getArchivedTmdbIds()
    const summary: ImportResult = { matched: 0, duplicate: 0, unmatched: [], failed: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress(i + 1)
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

    setResult(summary)
    setImporting(false)
    if (summary.matched > 0) onImported()
  }

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h2 style={{ margin: 0 }}>왓챠피디아에서 가져오기</h2>
      <p style={{ color: 'var(--color-neutral-500)', fontSize: 13, marginTop: 6 }}>
        왓챠피디아 평가 데이터를 내보낸 CSV 파일을 선택하면, 영화(Type=MOVIE) 항목을 TMDB에서 찾아
        라이브러리에 추가해요. 제목/연도가 일치하는 항목만 매칭하고, 못 찾은 작품은 아래에 목록으로
        보여드려요.
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

      {rows && !result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>
            영화 {rows.length}개를 찾았어요.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 10 }}
            disabled={importing}
            onClick={startImport}
          >
            {importing ? `가져오는 중... (${progress}/${rows.length})` : '가져오기 시작'}
          </button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          <div className="hr" />
          <div style={{ fontSize: 14 }}>
            매칭 성공 {result.matched}개 · 이미 보관됨 {result.duplicate}개 · 매칭 실패{' '}
            {result.unmatched.length}개
            {result.failed.length > 0 && ` · 오류 ${result.failed.length}개`}
          </div>

          {result.unmatched.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-500)', marginBottom: 6 }}>
                TMDB에서 못 찾은 작품 (검색·추가에서 직접 찾아보세요)
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
      )}
    </div>
  )
}
