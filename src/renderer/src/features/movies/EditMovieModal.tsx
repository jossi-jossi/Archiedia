import { useState } from 'react'
import { updateMovieMetadata, Movie } from './api'
import { errorMessage } from '../../lib/errors'

interface Props {
  movie: Movie
  onClose: () => void
  onSaved: (updated: Movie) => void
}

// 팝업 높이를 고정하고(예전 auto-height의 대략 2배), 제목과 취소/저장 버튼만 항상
// 보이게 고정한 채 그 사이 내용만 스크롤되게 한다. 줄거리 textarea는 이 여유 공간을
// 그대로 흡수해서 자기 몫의 높이를 갖는 대신, 남는 세로 공간을 채우며 늘어난다 —
// 그래서 textarea 자체의 리사이즈/스크롤바가 필요 없다.
const EDIT_MODAL_HEIGHT = 540

export function EditMovieModal({ movie, onClose, onSaved }: Props): React.JSX.Element {
  const meta = movie.metadata
  const [director, setDirector] = useState(meta.director ?? '')
  const [actors, setActors] = useState(meta.actors.join(', '))
  const [overview, setOverview] = useState(meta.overview ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(): Promise<void> {
    setSaving(true)
    setError(null)
    const nextMetadata = {
      ...meta,
      director: director.trim() || null,
      actors: actors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      overview: overview.trim() || null
    }
    try {
      await updateMovieMetadata(movie.id, nextMetadata, movie.posterUrl)
      onSaved({ ...movie, metadata: nextMetadata })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog"
        style={{
          width: 440,
          height: EDIT_MODAL_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'left',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-title" style={{ flex: 'none' }}>
          영화 정보 수정
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginTop: 4
          }}
        >
          <div className="field" style={{ flex: 'none' }}>
            <label>감독</label>
            <input
              className="input"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 'none' }}>
            <label>출연</label>
            <input
              className="input"
              value={actors}
              onChange={(e) => setActors(e.target.value)}
              placeholder="쉼표로 구분"
            />
          </div>
          <div
            className="field"
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <label>줄거리</label>
            <textarea
              className="input"
              style={{ flex: 1, minHeight: 0, resize: 'none', overflowY: 'hidden' }}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <div style={{ flex: 'none', fontSize: 13, color: '#e08a8a', marginTop: 10 }}>{error}</div>
        )}
        <div className="dialog-actions" style={{ flex: 'none', justifyContent: 'center' }}>
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
