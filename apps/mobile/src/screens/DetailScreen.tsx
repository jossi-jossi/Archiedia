import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import {
  ArrowLeft,
  ArrowSquareOut,
  CaretDown,
  Heart,
  PencilSimple,
  PlayCircle,
  Trash
} from 'phosphor-react-native'
import type { ContentItem, UserRecord } from '@archiedia/schema'
import { colors, radius } from '../theme'
import { Chip, Field, Input, Poster, StarRating } from '../components/ui'
import { PickerSheet } from '../components/PickerSheet'
import { EditField, EditFieldsModal } from '../components/EditFieldsModal'
import {
  ContentListItem,
  deleteContent,
  getContent,
  updateContent,
  updateUserRecord,
  UserRecordPatch
} from '../features/content'
import { typeConfig } from '../features/types'
import { isWishlisted, withoutStatusTags } from '../lib/wishlist'
import { authorNames } from '../lib/aladin'
import { normalizeGenres, stripHash } from '../lib/webtoonGenres'
import { errorMessage } from '../lib/errors'

interface Props {
  id: string
  onBack: () => void
  onDeleted: () => void
}

export function DetailScreen({ id, onBack, onDeleted }: Props): React.JSX.Element {
  const [entry, setEntry] = useState<ContentListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seasonIndex, setSeasonIndex] = useState(0)
  const [seasonSheet, setSeasonSheet] = useState(false)
  const [editSheet, setEditSheet] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- id가 바뀌면 비동기 조회가 끝나기 전에 로딩/에러/시즌 상태를 먼저 되돌려야 한다
    setLoading(true)
    setError(null)
    setSeasonIndex(0)
    getContent(id)
      .then(setEntry)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  async function save(patch: UserRecordPatch): Promise<void> {
    const record = entry?.record
    if (!entry || !record) return
    const next: UserRecord = { ...record, ...patch } as UserRecord
    setEntry({ ...entry, record: next })
    try {
      await updateUserRecord(record.id, patch)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function confirmDelete(): void {
    if (!entry) return
    Alert.alert('삭제', `"${entry.item.title}"을(를) 보관함에서 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteContent(entry.item.id)
            onDeleted()
          } catch (err) {
            setError(errorMessage(err))
          }
        }
      }
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }
  if (error && !entry) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.danger }}>{error}</Text>
      </View>
    )
  }
  if (!entry) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.neutral500 }}>항목을 찾을 수 없어요.</Text>
      </View>
    )
  }

  const { item, record } = entry
  const config = typeConfig(item.type)
  const wish = record ? isWishlisted(record.tags) : false
  const editFields = buildEditFields(item, seasonIndex)

  async function handleSaveEdit(values: Record<string, string>): Promise<void> {
    if (!entry) return
    const patch = buildEditPatch(entry.item, seasonIndex, values)
    await updateContent(entry.item.id, patch)
    setEntry({
      ...entry,
      item: {
        ...entry.item,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        metadata: patch.metadata
      } as ContentItem
    })
    setEditSheet(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={16} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 14 }}>{config.label}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {editFields ? (
          <Pressable style={styles.iconButton} onPress={() => setEditSheet(true)}>
            <PencilSimple size={16} color={colors.text} />
          </Pressable>
        ) : null}
        <Pressable style={styles.iconButton} onPress={confirmDelete}>
          <Trash size={17} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center' }}>
        <Poster
          url={item.posterUrl}
          backgroundUrl={item.type === 'webtoon' ? item.metadata.backgroundImageUrl : null}
          style={styles.poster}
        />
        <View style={{ marginTop: 14, width: '100%' }}>
          <Text style={styles.title}>{item.title}</Text>
          <Header item={item} />
          <Tags item={item} seasonIndex={seasonIndex} onOpenSeasons={() => setSeasonSheet(true)} />
          <LinkButtons item={item} seasonIndex={seasonIndex} />
        </View>
      </View>

      <Meta item={item} seasonIndex={seasonIndex} overviewLabel={config.overviewLabel} />

      <View style={styles.divider} />

      {record ? (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 5 }}>
            <Text style={styles.fieldLabel}>평점</Text>
            <View style={{ paddingVertical: 4 }}>
              <StarRating
                rating={record.myRating}
                size={24}
                onRate={(value) => save({ myRating: value })}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label={config.countLabel}>
              <Input
                value={record.watchCount === 0 ? '' : String(record.watchCount)}
                placeholder="0"
                keyboardType="number-pad"
                onChangeText={(text) =>
                  setEntry({
                    ...entry,
                    record: { ...record, watchCount: Number(text.replace(/\D/g, '')) || 0 }
                  })
                }
                onBlur={() => save({ watchCount: record.watchCount })}
              />
            </Field>
            <Field label="상태">
              <Pressable
                style={[styles.wishButton, wish && { backgroundColor: colors.accent }]}
                onPress={() =>
                  save({
                    tags: wish
                      ? withoutStatusTags(record.tags)
                      : [...withoutStatusTags(record.tags), '보고 싶음']
                  })
                }
              >
                <Heart
                  size={14}
                  weight={wish ? 'fill' : 'regular'}
                  color={wish ? colors.accent900 : colors.text}
                />
                <Text style={{ fontSize: 13, color: wish ? colors.accent900 : colors.text }}>
                  보고 싶어요
                </Text>
              </Pressable>
            </Field>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Field label={config.mediumLabel}>
              <Input
                value={record.watchMedium ?? ''}
                placeholder={config.mediumPlaceholder}
                onChangeText={(text) =>
                  setEntry({ ...entry, record: { ...record, watchMedium: text } })
                }
                onBlur={() => save({ watchMedium: record.watchMedium })}
              />
            </Field>
            <Field label={config.dateLabel}>
              <Input
                value={record.lastWatchedAt ?? ''}
                placeholder="YYYY-MM-DD"
                onChangeText={(text) =>
                  setEntry({ ...entry, record: { ...record, lastWatchedAt: text || null } })
                }
                onBlur={() => save({ lastWatchedAt: record.lastWatchedAt })}
              />
            </Field>
          </View>

          <Field label="나의 후기">
            <Input
              value={record.myReview ?? ''}
              placeholder="이 작품에 대한 생각을 기록해보세요"
              multiline
              onChangeText={(text) => setEntry({ ...entry, record: { ...record, myReview: text } })}
              onBlur={() => save({ myReview: record.myReview })}
            />
          </Field>
        </View>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text> : null}

      {item.type === 'drama' && item.metadata.seasons.length >= 2 ? (
        <PickerSheet
          visible={seasonSheet}
          title="시즌"
          columns={1}
          showCheck
          options={item.metadata.seasons.map((s, i) => ({
            value: String(i),
            label: `시즌 ${s.seasonNumber}`
          }))}
          selected={[String(seasonIndex)]}
          onToggle={(value) => setSeasonIndex(Number(value))}
          onClose={() => setSeasonSheet(false)}
        />
      ) : null}

      {editFields ? (
        <EditFieldsModal
          visible={editSheet}
          title={
            item.type === 'drama' && item.metadata.seasons.length >= 2
              ? `시즌 ${item.metadata.seasons[seasonIndex]?.seasonNumber ?? 1} 정보 수정`
              : `${config.label} 정보 수정`
          }
          fields={editFields}
          onSave={handleSaveEdit}
          onClose={() => setEditSheet(false)}
        />
      ) : null}
    </ScrollView>
  )
}

// 영화/시리즈는 감독·출연·줄거리, 책은 제목·요약만 고칠 수 있다. 웹툰은 편집 항목이
// 없어서 null — 호출부에서 이 값으로 수정 버튼 자체를 숨긴다.
function buildEditFields(item: ContentItem, seasonIndex: number): EditField[] | null {
  if (item.type === 'movie') {
    const m = item.metadata
    return [
      { key: 'director', label: '감독', value: m.director ?? '' },
      { key: 'actors', label: '출연', value: m.actors.join(', '), placeholder: '쉼표로 구분' },
      { key: 'overview', label: '줄거리', value: m.overview ?? '', multiline: true }
    ]
  }
  if (item.type === 'drama') {
    const season = item.metadata.seasons[seasonIndex]
    if (!season) return null
    return [
      { key: 'director', label: '감독', value: season.director ?? '' },
      { key: 'actors', label: '출연', value: season.actors.join(', '), placeholder: '쉼표로 구분' },
      { key: 'overview', label: '줄거리', value: season.overview ?? '', multiline: true }
    ]
  }
  if (item.type === 'book') {
    return [
      { key: 'title', label: '제목', value: item.title },
      { key: 'author', label: '지은이', value: item.metadata.author ?? '' },
      { key: 'overview', label: '요약', value: item.metadata.overview ?? '', multiline: true }
    ]
  }
  return null
}

function buildEditPatch(
  item: ContentItem,
  seasonIndex: number,
  values: Record<string, string>
): { title?: string; metadata: unknown } {
  if (item.type === 'movie') {
    return {
      metadata: {
        ...item.metadata,
        director: values.director.trim() || null,
        actors: values.actors
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        overview: values.overview.trim() || null
      }
    }
  }
  if (item.type === 'drama') {
    const season = item.metadata.seasons[seasonIndex]
    const nextSeason = {
      ...season,
      director: values.director.trim() || null,
      actors: values.actors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      overview: values.overview.trim() || null
    }
    const seasons = item.metadata.seasons.map((s, i) => (i === seasonIndex ? nextSeason : s))
    return { metadata: { ...item.metadata, seasons } }
  }
  if (item.type === 'book') {
    const title = values.title.trim()
    if (!title) throw new Error('제목을 입력해주세요')
    return {
      title,
      metadata: {
        ...item.metadata,
        author: values.author.trim() || null,
        overview: values.overview.trim() || null
      }
    }
  }
  throw new Error('수정할 수 없는 항목이에요')
}

function Header({ item }: { item: ContentItem }): React.JSX.Element | null {
  let text = ''
  if (item.type === 'movie' || item.type === 'drama') {
    text = `${item.metadata.releaseYear ?? '—'} · ${item.metadata.genres.join(', ') || '—'}`
  } else if (item.type === 'webtoon') {
    const m = item.metadata
    const episodes = m.totalEpisodes ? `${m.totalEpisodes}화 ` : ''
    text = `${m.author ?? '—'} · ${normalizeGenres(m.genres).join(', ') || '—'} | ${episodes}${m.isFinished ? '완결' : '연재 중'}`
  } else if (item.type === 'book') {
    const m = item.metadata
    text = `${authorNames(m.author) ?? '—'} | ${m.pageCount ? `${m.pageCount}페이지` : '—'}`
  }
  if (!text) return null
  return <Text style={styles.headerLine}>{text}</Text>
}

function Tags({
  item,
  seasonIndex,
  onOpenSeasons
}: {
  item: ContentItem
  seasonIndex: number
  onOpenSeasons: () => void
}): React.JSX.Element | null {
  const chips: React.ReactNode[] = []

  if (item.type === 'movie') {
    const m = item.metadata
    if (m.country) chips.push(<Chip key="country" label={m.country} />)
    if (m.runtimeMinutes) chips.push(<Chip key="runtime" label={`${m.runtimeMinutes}분`} />)
  } else if (item.type === 'drama') {
    const m = item.metadata
    const seasons = m.seasons
    const multi = seasons.length >= 2
    const current = seasons[seasonIndex]
    const total = seasons.reduce((sum, s) => sum + s.episodeCount, 0)
    if (m.country) chips.push(<Chip key="country" label={m.country} />)
    if (multi) chips.push(<Chip key="seasons" label={`시즌 ${seasons.length}개`} />)
    if (total > 0) chips.push(<Chip key="episodes" label={`${total}부`} />)
    if (!multi && current?.runtimeMinutes) {
      chips.push(<Chip key="runtime" label={`${current.runtimeMinutes}분`} />)
    }
    if (multi) {
      chips.push(
        <Pressable key="season-select" style={styles.seasonSelect} onPress={onOpenSeasons}>
          <Text style={{ fontSize: 11, color: colors.accent }}>
            시즌 {current?.seasonNumber ?? 1}
          </Text>
          <CaretDown size={9} color={colors.accent} />
        </Pressable>
      )
      if (current) chips.push(<Chip key="season-eps" label={`${current.episodeCount}부`} />)
    }
  } else if (item.type === 'webtoon') {
    item.metadata.tags.slice(0, 10).forEach((tag) => {
      chips.push(<Chip key={tag} label={stripHash(tag)} variant="neutral" />)
    })
  }

  if (chips.length === 0) return null
  return <View style={styles.chipRow}>{chips}</View>
}

function LinkButtons({
  item,
  seasonIndex
}: {
  item: ContentItem
  seasonIndex: number
}): React.JSX.Element | null {
  let url: string | null = null
  let label = ''
  let icon: React.ReactNode = null

  if (item.type === 'movie') {
    url = item.metadata.trailerUrl
    label = '예고편 보기'
    icon = <PlayCircle size={15} color={colors.text} />
  } else if (item.type === 'drama') {
    url = item.metadata.seasons[seasonIndex]?.trailerUrl ?? item.metadata.trailerUrl
    label = '예고편 보기'
    icon = <PlayCircle size={15} color={colors.text} />
  } else if (item.type === 'webtoon') {
    url = item.metadata.sourceUrl
    label = '바로가기'
    icon = <ArrowSquareOut size={15} color={colors.text} />
  } else if (item.type === 'book') {
    url = item.metadata.sourceUrl
    label = '알라딘 바로가기'
    icon = <ArrowSquareOut size={15} color={colors.text} />
  }

  if (!url) return null
  const href = url
  return (
    <View style={{ alignItems: 'center', marginTop: 10 }}>
      <Pressable style={styles.linkButton} onPress={() => Linking.openURL(href)}>
        {icon}
        <Text style={{ fontSize: 12.5, color: colors.text }}>{label}</Text>
      </Pressable>
    </View>
  )
}

function Meta({
  item,
  seasonIndex,
  overviewLabel
}: {
  item: ContentItem
  seasonIndex: number
  overviewLabel: string
}): React.JSX.Element {
  const rows: { label: string; value: string }[] = []
  let overview: string | null = null

  if (item.type === 'movie') {
    rows.push({ label: '감독', value: item.metadata.director ?? '—' })
    rows.push({
      label: '출연',
      value: item.metadata.actors.length ? item.metadata.actors.join(', ') : '—'
    })
    overview = item.metadata.overview
  } else if (item.type === 'drama') {
    const season = item.metadata.seasons[seasonIndex]
    rows.push({ label: '감독', value: season?.director ?? '—' })
    rows.push({ label: '출연', value: season?.actors.length ? season.actors.join(', ') : '—' })
    overview = season?.overview ?? null
  } else if (item.type === 'book') {
    const m = item.metadata
    rows.push({
      label: '출판사·연도',
      value: `${m.publisher ?? '—'}${m.releaseYear ? ` · ${m.releaseYear}` : ''}`
    })
    rows.push({ label: '카테고리', value: m.category ?? '—' })
    overview = m.overview
  } else if (item.type === 'webtoon') {
    overview = item.metadata.overview
  }

  return (
    <View style={{ marginTop: 16, gap: 4 }}>
      {rows.map((row) => (
        <Text key={row.label} style={styles.metaRow}>
          <Text style={{ color: colors.neutral500 }}>{row.label}</Text>
          {'  '}
          {row.value}
        </Text>
      ))}
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12.5, color: colors.neutral500, marginBottom: 3 }}>
          {overviewLabel}
        </Text>
        <Text style={styles.overview}>{overview || '—'}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  poster: { width: 150, aspectRatio: 2 / 3 },
  title: { fontSize: 19, fontWeight: '500', color: colors.text, textAlign: 'center' },
  headerLine: {
    color: colors.neutral500,
    fontSize: 12.5,
    marginTop: 3,
    textAlign: 'center'
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
    justifyContent: 'center'
  },
  seasonSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md * 0.75,
    borderWidth: 1,
    borderColor: colors.accent
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.neutral800
  },
  metaRow: { fontSize: 13, lineHeight: 20, color: colors.neutral300 },
  overview: { fontSize: 12.5, lineHeight: 20, color: colors.neutral400 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 16 },
  fieldLabel: { fontSize: 12, color: colors.neutral500 },
  wishButton: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  }
})
