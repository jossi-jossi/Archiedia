import { MagnifyingGlass } from '@phosphor-icons/react'
import { useState } from 'react'
import { AddMovieForm, AddMovieInitial } from './AddMovieForm'
import { TmdbSearch } from './TmdbSearch'

interface Props {
  onCreated: (id: string) => void
}

export function AddMovieScreen({ onCreated }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [initial, setInitial] = useState<AddMovieInitial | undefined>(undefined)

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
            placeholder="TMDB에서 영화 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {!initial && <TmdbSearch query={query} onPick={setInitial} />}

      {initial && <AddMovieForm key={initial.title} initial={initial} onCreated={onCreated} />}
    </div>
  )
}
