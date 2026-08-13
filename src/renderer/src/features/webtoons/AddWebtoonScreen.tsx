import { MagnifyingGlass } from '@phosphor-icons/react'
import { useState } from 'react'
import { NaverSearch } from './NaverSearch'

interface Props {
  onArchived: () => void
}

export function AddWebtoonScreen({ onArchived }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <h2 style={{ margin: 0, flex: 'none', whiteSpace: 'nowrap' }}>검색 · 추가</h2>
        <div style={{ position: 'relative', width: 320, flex: 'none' }}>
          <MagnifyingGlass
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-neutral-500)'
            }}
          />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            placeholder="네이버웹툰에서 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <NaverSearch query={query} onArchived={onArchived} />
    </div>
  )
}
