import { MagnifyingGlass } from '@phosphor-icons/react'
import { useState } from 'react'
import { TmdbSearch } from '../movies/TmdbSearch'
import { TvSearch } from '../series/TvSearch'
import { WebtoonSearch } from '../webtoons/WebtoonSearch'
import { AladinSearch } from '../books/AladinSearch'

export type SearchType = 'movie' | 'series' | 'webtoon' | 'book'

const TYPES: { value: SearchType; label: string; placeholder: string }[] = [
  { value: 'movie', label: '영화', placeholder: 'TMDB에서 영화 검색' },
  { value: 'series', label: '시리즈', placeholder: 'TMDB에서 시리즈 검색' },
  { value: 'webtoon', label: '웹툰', placeholder: '네이버웹툰·카카오웹툰에서 검색' },
  { value: 'book', label: '책', placeholder: '알라딘에서 책 검색' }
]

interface Props {
  type: SearchType
  onTypeChange: (type: SearchType) => void
  onArchived: () => void
}

// 영화/시리즈/웹툰/책 검색을 한 화면에서 처리한다. 검색어는 종류를 바꿔도 유지돼서
// 같은 제목을 다른 종류로 바로 찾아볼 수 있다.
export function AddScreen({ type, onTypeChange, onArchived }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const active = TYPES.find((t) => t.value === type) ?? TYPES[0]

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
            placeholder={active.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {/* 네 칸을 1fr 그리드로 깔면 가장 넓은 "시리즈"에 맞춰 폭이 자동으로 통일된다. */}
        <div
          className="seg"
          style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          {TYPES.map((t) => (
            <label
              key={t.value}
              className="seg-opt"
              style={{
                boxShadow: 'none',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                color: type === t.value ? 'var(--color-accent)' : undefined,
                background:
                  type === t.value
                    ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                    : undefined
              }}
            >
              <input
                type="radio"
                name="search-type"
                checked={type === t.value}
                onChange={() => onTypeChange(t.value)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {type === 'movie' && <TmdbSearch query={query} onArchived={onArchived} />}
      {type === 'series' && <TvSearch query={query} onArchived={onArchived} />}
      {type === 'webtoon' && <WebtoonSearch query={query} onArchived={onArchived} />}
      {type === 'book' && <AladinSearch query={query} onArchived={onArchived} />}
    </div>
  )
}
