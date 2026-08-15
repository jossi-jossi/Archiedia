import { useState } from 'react'
import { updateBookInfo, Book } from './api'
import { errorMessage } from '../../lib/errors'

interface Props {
  book: Book
  onClose: () => void
  onSaved: (updated: Book) => void
}

export function EditBookModal({ book, onClose, onSaved }: Props): React.JSX.Element {
  const [title, setTitle] = useState(book.title)
  const [overview, setOverview] = useState(book.metadata.overview ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(): Promise<void> {
    const nextTitle = title.trim()
    if (!nextTitle) {
      setError('제목을 입력해주세요')
      return
    }
    setSaving(true)
    setError(null)
    const nextMetadata = { ...book.metadata, overview: overview.trim() || null }
    try {
      await updateBookInfo(book.id, nextTitle, nextMetadata)
      onSaved({ ...book, title: nextTitle, metadata: nextMetadata })
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
        <div className="dialog-title">책 정보 수정</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <div className="field">
            <label>제목</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>요약</label>
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
