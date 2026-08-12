import type { MovieMetadata } from '@archiedia/schema'
import { Plus } from '@phosphor-icons/react'
import { FormEvent, useState } from 'react'
import { errorMessage } from '../../lib/errors'
import { createMovie } from './api'

export interface AddMovieInitial {
  title: string
  posterUrl: string | null
  metadata: MovieMetadata
}

interface Props {
  onCreated: (id: string) => void
  initial?: AddMovieInitial
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function AddMovieForm({ onCreated, initial }: Props): React.JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [originalTitle, setOriginalTitle] = useState(initial?.metadata.originalTitle ?? '')
  const [releaseYear, setReleaseYear] = useState(initial?.metadata.releaseYear?.toString() ?? '')
  const [runtimeMinutes, setRuntimeMinutes] = useState(
    initial?.metadata.runtimeMinutes?.toString() ?? ''
  )
  const [director, setDirector] = useState(initial?.metadata.director ?? '')
  const [country, setCountry] = useState(initial?.metadata.country ?? '')
  const [genres, setGenres] = useState(initial?.metadata.genres.join(', ') ?? '')
  const [actors, setActors] = useState(initial?.metadata.actors.join(', ') ?? '')
  const [trailerUrl, setTrailerUrl] = useState(initial?.metadata.trailerUrl ?? '')
  const [posterUrl, setPosterUrl] = useState(initial?.posterUrl ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const id = await createMovie({
        title,
        posterUrl: posterUrl.trim() || null,
        metadata: {
          originalTitle: originalTitle.trim() || null,
          releaseYear: releaseYear ? Number(releaseYear) : null,
          director: director.trim() || null,
          genres: splitList(genres),
          actors: splitList(actors),
          runtimeMinutes: runtimeMinutes ? Number(runtimeMinutes) : null,
          country: country.trim() || null,
          trailerUrl: trailerUrl.trim() || null,
          relatedContentItemIds: []
        }
      })
      onCreated(id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 28, maxWidth: 760 }}>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, width: 180 }}>
        <div
          style={{
            width: 180,
            aspectRatio: '2 / 3',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            color: 'var(--color-neutral-500)',
            background: posterUrl ? `center / cover no-repeat url(${posterUrl})` : undefined
          }}
        >
          {!posterUrl && <span style={{ fontFamily: 'monospace', fontSize: 11 }}>POSTER</span>}
        </div>
        <div className="field">
          <label>포스터 URL</label>
          <input
            className="input"
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>제목</label>
            <input
              className="input"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="영화 제목"
            />
          </div>
          <div className="field">
            <label>원제</label>
            <input
              className="input"
              value={originalTitle}
              onChange={(e) => setOriginalTitle(e.target.value)}
              placeholder="원어 제목"
            />
          </div>
          <div className="field">
            <label>개봉연도</label>
            <input
              className="input"
              type="number"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
              placeholder="2024"
            />
          </div>
          <div className="field">
            <label>러닝타임 (분)</label>
            <input
              className="input"
              type="number"
              value={runtimeMinutes}
              onChange={(e) => setRuntimeMinutes(e.target.value)}
              placeholder="120"
            />
          </div>
          <div className="field">
            <label>감독</label>
            <input
              className="input"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
              placeholder="감독명"
            />
          </div>
          <div className="field">
            <label>제작 국가</label>
            <input
              className="input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="한국"
            />
          </div>
          <div className="field">
            <label>장르</label>
            <input
              className="input"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="드라마, 스릴러"
            />
          </div>
          <div className="field">
            <label>예고편 URL</label>
            <input
              className="input"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>
        <div className="field">
          <label>배우</label>
          <input
            className="input"
            value={actors}
            onChange={(e) => setActors(e.target.value)}
            placeholder="주연 배우 (쉼표로 구분)"
          />
        </div>

        {error && <div style={{ fontSize: 13, color: '#e08a8a' }}>{error}</div>}

        <button
          className="btn btn-primary btn-block"
          style={{ maxWidth: 160 }}
          type="submit"
          disabled={submitting}
        >
          <Plus />
          라이브러리에 추가
        </button>
      </div>
    </form>
  )
}
