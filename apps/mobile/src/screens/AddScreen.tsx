import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, MagnifyingGlass, Plus } from 'phosphor-react-native'
import type { ContentType } from '@archiedia/schema'
import { colors, radius } from '../theme'
import { Input, Poster } from '../components/ui'
import { createContent, getArchivedExternalIds } from '../features/content'
import { TYPES, typeConfig } from '../features/types'
import { getBookDetails, searchBooks, authorNames, categoryGroup } from '../lib/aladin'
import { getMovieDetails, getTvDetails, searchMovies, searchTv } from '../lib/tmdb'
import * as naverWebtoon from '../lib/naverWebtoon'
import * as kakaoWebtoon from '../lib/kakaoWebtoon'
import { normalizeGenres } from '../lib/webtoonGenres'
import { errorMessage } from '../lib/errors'

const SEARCH_DEBOUNCE_MS = 350

interface Row {
  key: string
  externalId: string
  title: string
  subtitle: string
  posterUrl: string | null
  // 카카오웹툰만 배경 삽화가 따로 있다 (배경 위에 캐릭터를 얹는 2겹 카드).
  backgroundUrl?: string | null
  archive: () => Promise<void>
}

interface Props {
  type: ContentType
  onTypeChange: (type: ContentType) => void
  onArchived: () => void
}

export function AddScreen({ type, onTypeChange, onArchived }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [searching, setSearching] = useState(false)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getArchivedExternalIds(type)
      .then(setArchivedIds)
      .catch((err) => setError(errorMessage(err)))
  }, [type])

  const search = useCallback(
    async (keyword: string): Promise<Row[]> => {
      if (type === 'movie') {
        const results = await searchMovies(keyword)
        return results.map((r) => ({
          key: `movie:${r.id}`,
          externalId: String(r.id),
          title: r.title,
          subtitle: `${r.year ?? '—'} · ${r.genres.join(', ') || '—'}`,
          posterUrl: r.posterUrl,
          archive: async () => {
            const details = await getMovieDetails(r.id)
            await createContent({
              type: 'movie',
              source: 'tmdb',
              title: details.title,
              posterUrl: details.posterUrl,
              externalId: String(r.id),
              metadata: details.metadata
            })
          }
        }))
      }

      if (type === 'drama') {
        const results = await searchTv(keyword)
        return results.map((r) => ({
          key: `drama:${r.id}`,
          externalId: String(r.id),
          title: r.title,
          subtitle: `${r.year ?? '—'} · ${r.genres.join(', ') || '—'}`,
          posterUrl: r.posterUrl,
          archive: async () => {
            const details = await getTvDetails(r.id)
            await createContent({
              type: 'drama',
              source: 'tmdb',
              title: details.title,
              posterUrl: details.posterUrl,
              externalId: String(r.id),
              metadata: details.metadata
            })
          }
        }))
      }

      if (type === 'webtoon') {
        const [naver, kakao] = await Promise.all([
          naverWebtoon.searchWebtoons(keyword),
          kakaoWebtoon.searchWebtoons(keyword)
        ])
        return [
          ...naver.map((r) => ({
            key: `naver:${r.id}`,
            externalId: String(r.id),
            title: r.title,
            subtitle: `${r.author} · ${normalizeGenres(r.genres).join(', ') || '—'}`,
            posterUrl: r.thumbnailUrl,
            archive: async () => {
              const details = await naverWebtoon.getWebtoonDetails(r.id)
              await createContent({
                type: 'webtoon',
                source: 'naver',
                title: details.title,
                posterUrl: details.posterUrl,
                externalId: String(r.id),
                metadata: details.metadata
              })
            }
          })),
          ...kakao.map((r) => ({
            key: `kakao:${r.id}`,
            externalId: String(r.id),
            title: r.title,
            subtitle: `${r.authors ?? '—'} · ${normalizeGenres([r.genre]).join(', ') || '—'}`,
            posterUrl: r.posterUrl,
            backgroundUrl: r.backgroundImageUrl,
            archive: async () => {
              const details = await kakaoWebtoon.getWebtoonDetails(r)
              await createContent({
                type: 'webtoon',
                source: 'kakao',
                title: details.title,
                posterUrl: details.posterUrl,
                externalId: String(r.id),
                metadata: details.metadata
              })
            }
          }))
        ]
      }

      const results = await searchBooks(keyword)
      return results.map((r) => ({
        key: `book:${r.id}`,
        externalId: String(r.id),
        title: r.title,
        subtitle: `${authorNames(r.author) ?? '—'} · ${categoryGroup(r.category) ?? '—'}`,
        posterUrl: r.posterUrl,
        archive: async () => {
          const details = await getBookDetails(r.id)
          await createContent({
            type: 'book',
            source: 'aladin',
            title: details.title,
            posterUrl: details.posterUrl,
            externalId: String(r.id),
            metadata: details.metadata
          })
        }
      }))
    },
    [type]
  )

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 검색창을 비우면 결과도 즉시 지운다
      setRows([])
      return
    }

    setSearching(true)
    setError(null)
    const timer = setTimeout(() => {
      search(trimmed)
        .then(setRows)
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setSearching(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, search])

  async function handleArchive(row: Row): Promise<void> {
    setArchivingId(row.key)
    setError(null)
    try {
      await row.archive()
      setArchivedIds((prev) => new Set(prev).add(row.externalId))
      onArchived()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.segment}>
          {TYPES.map((t) => {
            const active = t.key === type
            return (
              <Pressable
                key={t.key}
                style={[styles.segmentOption, active && styles.segmentOptionActive]}
                onPress={() => onTypeChange(t.key)}
              >
                <Text style={{ fontSize: 13, color: active ? colors.accent : colors.text }}>
                  {t.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View style={{ justifyContent: 'center' }}>
          <MagnifyingGlass size={14} color={colors.neutral500} style={styles.searchIcon} />
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={typeConfig(type).placeholder}
            style={{ paddingLeft: 30 }}
            autoCorrect={false}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {searching && rows.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : null}
        {!searching && query.trim() && rows.length === 0 ? (
          <Text style={styles.empty}>검색 결과가 없어요.</Text>
        ) : null}

        {rows.map((row) => {
          const archived = archivedIds.has(row.externalId)
          const busy = archivingId === row.key
          return (
            <View key={row.key} style={styles.row}>
              <Poster
                url={row.posterUrl}
                backgroundUrl={row.backgroundUrl}
                style={styles.rowPoster}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {row.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {row.subtitle}
                </Text>
              </View>
              {archived ? (
                // 보관된 항목은 버튼 테두리 없이 흰 체크만 보여준다.
                <View style={styles.checkSlot}>
                  <Check size={18} color={colors.text} weight="bold" />
                </View>
              ) : (
                <Pressable
                  style={[styles.addButton, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={() => handleArchive(row)}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Plus size={17} color={colors.accent} />
                  )}
                </Pressable>
              )}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 10, gap: 12 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    overflow: 'hidden'
  },
  segmentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9
  },
  segmentOptionActive: {
    backgroundColor: colors.accent900
  },
  searchIcon: { position: 'absolute', left: 10, zIndex: 1 },
  list: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 18 },
  error: { color: colors.danger, fontSize: 13, paddingVertical: 8 },
  empty: { color: colors.neutral500, paddingVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  rowPoster: { width: 34, height: 48, borderRadius: 4 },
  rowTitle: { fontSize: 13.5, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 11.5, color: colors.neutral500, marginTop: 2 },
  checkSlot: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center'
  }
})
