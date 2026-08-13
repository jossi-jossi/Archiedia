import { Check, Plus } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/errors'
import * as naverWebtoon from '../../lib/naverWebtoon'
import * as kakaoWebtoon from '../../lib/kakaoWebtoon'
import { createWebtoon, getArchivedWebtoonIds } from './api'
import { webtoonPosterFill } from './poster'
import { SourceLogo } from './sourceLogo'

interface Props {
  query: string
  onArchived: () => void
}

// 네이버/카카오 검색 결과를 한 화면에 같이 보여주기 위한 공통 모양. raw는 보관할 때 각
// 소스의 상세 조회 함수(getWebtoonDetails)에 그대로 넘긴다.
interface UnifiedResult {
  key: string
  source: 'naver' | 'kakao'
  id: number
  title: string
  subtitle: string
  posterUrl: string | null
  backgroundImageUrl: string | null
  raw: naverWebtoon.WebtoonSearchResult | kakaoWebtoon.WebtoonSearchResult
}

const SEARCH_DEBOUNCE_MS = 350

export function WebtoonSearch({ query, onArchived }: Props): React.JSX.Element {
  const [results, setResults] = useState<UnifiedResult[]>([])
  const [searching, setSearching] = useState(false)
  const [archivingKey, setArchivingKey] = useState<string | null>(null)
  const [archivedKeys, setArchivedKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getArchivedWebtoonIds('naver'), getArchivedWebtoonIds('kakao')])
      .then(([naverIds, kakaoIds]) => {
        const keys = new Set<string>()
        naverIds.forEach((id) => keys.add(`naver:${id}`))
        kakaoIds.forEach((id) => keys.add(`kakao:${id}`))
        setArchivedKeys(keys)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when the search box is emptied
      setResults([])
      return
    }

    setSearching(true)
    setError(null)
    const timer = setTimeout(() => {
      Promise.all([naverWebtoon.searchWebtoons(trimmed), kakaoWebtoon.searchWebtoons(trimmed)])
        .then(([naverResults, kakaoResults]) => {
          const naverUnified: UnifiedResult[] = naverResults.map((r) => ({
            key: `naver:${r.id}`,
            source: 'naver',
            id: r.id,
            title: r.title,
            subtitle: `${r.author} · ${r.genres.join(', ') || '—'}`,
            posterUrl: r.thumbnailUrl,
            backgroundImageUrl: null,
            raw: r
          }))
          const kakaoUnified: UnifiedResult[] = kakaoResults.map((r) => ({
            key: `kakao:${r.id}`,
            source: 'kakao',
            id: r.id,
            title: r.title,
            subtitle: `${r.authors ?? '—'} · ${r.genre || '—'}`,
            posterUrl: r.posterUrl,
            backgroundImageUrl: r.backgroundImageUrl,
            raw: r
          }))
          setResults([...naverUnified, ...kakaoUnified])
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setSearching(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  async function handleArchive(result: UnifiedResult): Promise<void> {
    setError(null)
    setArchivingKey(result.key)
    try {
      if (result.source === 'naver') {
        const details = await naverWebtoon.getWebtoonDetails(result.id)
        await createWebtoon({
          title: details.title,
          posterUrl: details.posterUrl,
          externalId: String(result.id),
          source: 'naver',
          metadata: details.metadata
        })
      } else {
        const details = await kakaoWebtoon.getWebtoonDetails(
          result.raw as kakaoWebtoon.WebtoonSearchResult
        )
        await createWebtoon({
          title: details.title,
          posterUrl: details.posterUrl,
          externalId: String(result.id),
          source: 'kakao',
          metadata: details.metadata
        })
      }
      setArchivedKeys((prev) => new Set(prev).add(result.key))
      onArchived()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setArchivingKey(null)
    }
  }

  return (
    <div>
      {error && <div style={{ fontSize: 13, color: '#e08a8a', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {results.map((r) => {
          const isArchived = archivedKeys.has(r.key)
          const isArchiving = archivingKey === r.key

          return (
            <div
              key={r.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 10,
                borderRadius: 'var(--radius-md)',
                background: 'color-mix(in srgb, var(--color-text) 3%, transparent)'
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 60,
                  flex: 'none',
                  borderRadius: 4,
                  ...webtoonPosterFill(r.posterUrl, r.backgroundImageUrl)
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {r.title}
                  </div>
                  <SourceLogo
                    source={r.source}
                    size={r.source === 'kakao' ? 15 : 14}
                    style={{ marginTop: r.source === 'naver' ? 3 : 2 }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{r.subtitle}</div>
              </div>
              <button
                type="button"
                className={isArchived ? 'btn btn-secondary' : 'btn btn-primary'}
                disabled={isArchived || isArchiving}
                onClick={() => handleArchive(r)}
                style={{
                  flex: 'none',
                  whiteSpace: 'nowrap',
                  cursor: isArchived ? 'default' : undefined
                }}
              >
                {isArchived ? (
                  <>
                    <Check />
                    보관 중
                  </>
                ) : (
                  <>
                    <Plus />
                    {isArchiving ? '보관 중...' : '보관하기'}
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {!searching && query.trim() && results.length === 0 && (
        <div style={{ color: 'var(--color-neutral-500)', marginTop: 8 }}>검색 결과가 없어요.</div>
      )}
    </div>
  )
}
