import { useState } from 'react'
import { updateBookInfo, Book } from './api'
import { errorMessage } from '../../lib/errors'

interface Props {
  book: Book
  onClose: () => void
  onSaved: (updated: Book) => void
}

// 팝업 높이를 고정하고(예전 auto-height의 대략 2배), 제목과 취소/저장 버튼만 항상
// 보이게 고정한 채 그 사이 내용만 스크롤되게 한다. 요약 textarea는 이 여유 공간을
// 그대로 흡수해서 자기 몫의 높이를 갖는 대신, 남는 세로 공간을 채우며 늘어난다 —
// 그래서 textarea 자체의 리사이즈/스크롤바가 필요 없다.
const EDIT_MODAL_HEIGHT = 540

export function EditBookModal({ book, onClose, onSaved }: Props): React.JSX.Element {
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.metadata.author ?? '')
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
    const nextMetadata = {
      ...book.metadata,
      author: author.trim() || null,
      overview: overview.trim() || null
    }
    try {
      await updateBookInfo(book.id, nextTitle, nextMetadata)
      onSaved({ ...book, title: nextTitle, metadata: nextMetadata })
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
          책 정보 수정
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
            <label>제목</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 'none' }}>
            <label>지은이</label>
            <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div
            className="field"
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          >
            <label>요약</label>
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
