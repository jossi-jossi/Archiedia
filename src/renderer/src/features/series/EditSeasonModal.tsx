import { useState } from 'react'
import { updateSeriesMetadata, Series } from './api'
import { errorMessage } from '../../lib/errors'

interface Props {
  series: Series
  seasonIndex: number
  onClose: () => void
  onSaved: (updated: Series) => void
}

// 감독/출연/줄거리는 시즌마다 따로 저장돼서, 현재 화면에 선택된 시즌 하나만 수정한다.
export function EditSeasonModal({
  series,
  seasonIndex,
  onClose,
  onSaved
}: Props): React.JSX.Element {
  const meta = series.metadata
  const season = meta.seasons[seasonIndex]
  const [director, setDirector] = useState(season.director ?? '')
  const [actors, setActors] = useState(season.actors.join(', '))
  const [overview, setOverview] = useState(season.overview ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMultiSeason = meta.seasons.length >= 2

  async function handleSave(): Promise<void> {
    setSaving(true)
    setError(null)
    const nextSeason = {
      ...season,
      director: director.trim() || null,
      actors: actors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      overview: overview.trim() || null
    }
    const nextSeasons = meta.seasons.map((s, i) => (i === seasonIndex ? nextSeason : s))
    const nextMetadata = { ...meta, seasons: nextSeasons }
    try {
      await updateSeriesMetadata(series.id, nextMetadata, series.posterUrl)
      onSaved({ ...series, metadata: nextMetadata })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={() => !saving && onClose()}>
      <div
        className="dialog"
        style={{ width: 440, textAlign: 'left', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-title">
          {isMultiSeason ? `시즌 ${season.seasonNumber} 정보 수정` : '시리즈 정보 수정'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <div className="field">
            <label>감독</label>
            <input
              className="input"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
            />
          </div>
          <div className="field">
            <label>출연</label>
            <input
              className="input"
              value={actors}
              onChange={(e) => setActors(e.target.value)}
              placeholder="쉼표로 구분"
            />
          </div>
          <div className="field">
            <label>줄거리</label>
            <textarea
              className="input"
              style={{ minHeight: 90 }}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
            />
          </div>
        </div>
        {error && <div style={{ fontSize: 13, color: '#e08a8a', marginTop: 10 }}>{error}</div>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
