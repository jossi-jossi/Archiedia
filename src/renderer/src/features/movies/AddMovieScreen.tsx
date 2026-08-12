import { useState } from 'react'
import { AddMovieForm, AddMovieInitial } from './AddMovieForm'
import { TmdbSearch } from './TmdbSearch'

interface Props {
  onCreated: (id: string) => void
}

type Source = 'tmdb' | 'manual'

export function AddMovieScreen({ onCreated }: Props): React.JSX.Element {
  const [source, setSource] = useState<Source>('tmdb')
  const [initial, setInitial] = useState<AddMovieInitial | undefined>(undefined)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 32px 40px' }}>
      <h2 style={{ margin: '0 0 16px' }}>검색 · 추가</h2>
      <div className="seg" style={{ marginBottom: 16 }}>
        <label className="seg-opt">
          <input
            type="radio"
            name="src"
            checked={source === 'tmdb'}
            onChange={() => {
              setSource('tmdb')
              setInitial(undefined)
            }}
          />
          TMDB
        </label>
        <label className="seg-opt">
          <input
            type="radio"
            name="src"
            checked={source === 'manual'}
            onChange={() => {
              setSource('manual')
              setInitial(undefined)
            }}
          />
          수동 입력
        </label>
      </div>

      {source === 'tmdb' && !initial && <TmdbSearch onPick={setInitial} />}

      {(source === 'manual' || initial) && (
        <AddMovieForm key={initial?.title ?? 'manual'} initial={initial} onCreated={onCreated} />
      )}
    </div>
  )
}
