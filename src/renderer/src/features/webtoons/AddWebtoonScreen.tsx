import { MagnifyingGlass } from '@phosphor-icons/react'
import { useState } from 'react'
import { NaverSearch } from './NaverSearch'
import { KakaoSearch } from './KakaoSearch'

interface Props {
  onArchived: () => void
}

type Source = 'naver' | 'kakao'

export function AddWebtoonScreen({ onArchived }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<Source>('naver')

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 32px 40px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
          flexWrap: 'wrap'
        }}
      >
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
            placeholder={source === 'naver' ? '네이버웹툰에서 검색' : '카카오웹툰에서 검색'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="seg" style={{ flex: 'none' }}>
          <label
            className="seg-opt"
            style={{
              padding: '10px 14px',
              boxShadow: 'none',
              color: source === 'naver' ? 'var(--color-accent)' : undefined,
              background:
                source === 'naver'
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : undefined
            }}
          >
            <input
              type="radio"
              name="webtoon-source"
              checked={source === 'naver'}
              onChange={() => setSource('naver')}
            />
            네이버웹툰
          </label>
          <label
            className="seg-opt"
            style={{
              padding: '10px 14px',
              boxShadow: 'none',
              color: source === 'kakao' ? 'var(--color-accent)' : undefined,
              background:
                source === 'kakao'
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : undefined
            }}
          >
            <input
              type="radio"
              name="webtoon-source"
              checked={source === 'kakao'}
              onChange={() => setSource('kakao')}
            />
            카카오웹툰
          </label>
        </div>
      </div>

      {source === 'naver' ? (
        <NaverSearch query={query} onArchived={onArchived} />
      ) : (
        <KakaoSearch query={query} onArchived={onArchived} />
      )}
    </div>
  )
}
