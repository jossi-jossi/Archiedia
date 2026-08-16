import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CaretDown, Eye, Gear, Heart, MagnifyingGlass } from 'phosphor-react-native'
import type { ContentType } from '@archiedia/schema'
import { colors, radius } from '../theme'
import { Chip, Input, Poster, StarRating } from '../components/ui'
import { PickerSheet } from '../components/PickerSheet'
import { ContentListItem, listContent, updateUserRecord } from '../features/content'
import { typeConfig } from '../features/types'
import { isWatching, isWishlisted, withoutStatusTags } from '../lib/wishlist'
import { authorNames, categoryGroup, categoryOrigin } from '../lib/aladin'
import { normalizeGenres } from '../lib/webtoonGenres'
import { errorMessage } from '../lib/errors'

type SortKey =
  | 'custom'
  | 'added_desc'
  | 'added_asc'
  | 'rating_desc'
  | 'rating_asc'
  | 'watched_desc'
  | 'watch_count_desc'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'custom', label: '사용자 지정순' },
  { value: 'added_desc', label: '보관 최신순' },
  { value: 'added_asc', label: '보관 오래된순' },
  { value: 'rating_desc', label: '나의 평점 높은순' },
  { value: 'rating_asc', label: '나의 평점 낮은순' },
  { value: 'watched_desc', label: '최근 시청순' },
  { value: 'watch_count_desc', label: '시청 횟수 높은순' }
]

const ORIGINS = ['국내도서', '외국도서']

// display_order가 없는(마이그레이션 전) 항목은 맨 뒤로 보낸다. 순서 변경 자체는
// 데스크톱에서만 가능하고, 모바일은 정해진 순서를 그대로 읽기만 한다.
const MISSING_ORDER = Number.MAX_SAFE_INTEGER

// 목록 카드에 쓰는 분류값 — 종류마다 출처가 다르다.
function itemGenres(entry: ContentListItem): string[] {
  const { item } = entry
  if (item.type === 'book') {
    const group = categoryGroup(item.metadata.category)
    return group ? [group] : []
  }
  if (item.type === 'webtoon') return normalizeGenres(item.metadata.genres)
  if (item.type === 'movie' || item.type === 'drama') return item.metadata.genres
  return []
}

function itemSubtitle(entry: ContentListItem): string {
  const { item } = entry
  if (item.type === 'book') {
    return `${authorNames(item.metadata.author) ?? '—'} · ${categoryGroup(item.metadata.category) ?? '—'}`
  }
  if (item.type === 'webtoon') {
    return `${item.metadata.author ?? '—'} · ${normalizeGenres(item.metadata.genres).join(', ') || '—'}`
  }
  if (item.type === 'movie' || item.type === 'drama') {
    return `${item.metadata.releaseYear ?? '—'} · ${item.metadata.genres.join(', ') || '—'}`
  }
  return ''
}

function searchableText(entry: ContentListItem): string {
  const { item } = entry
  const author = item.type === 'book' || item.type === 'webtoon' ? (item.metadata.author ?? '') : ''
  return `${item.title} ${author}`.toLowerCase()
}

interface Props {
  type: ContentType
  refreshKey: number
  onSelect: (id: string) => void
  onOpenSettings: () => void
}

export function LibraryScreen({
  type,
  refreshKey,
  onSelect,
  onOpenSettings
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets()
  const config = typeConfig(type)

  const [items, setItems] = useState<ContentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState<string[]>([])
  const [originFilter, setOriginFilter] = useState<string[]>([])
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [watchingOnly, setWatchingOnly] = useState(false)
  const [finishedOnly, setFinishedOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('custom')
  const [sheet, setSheet] = useState<'genre' | 'sort' | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      setItems(await listContent(type))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [type])

  useEffect(() => {
    // 종류를 바꾸면(= load가 새로 만들어지면) 이전 종류의 필터는 의미가 없어서 같이 초기화한다.
    // 최초 마운트 때도 여기서 한 번 로딩 화면과 함께 불러온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 목록을 다시 읽기 전에 필터와 로딩 상태를 먼저 되돌려야 한다
    setGenreFilter([])
    setOriginFilter([])
    setWishlistOnly(false)
    setWatchingOnly(false)
    setFinishedOnly(false)
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const mountedRef = useRef(false)
  useEffect(() => {
    // 상세 팝업을 닫고 돌아올 때처럼 종류는 그대로인 refreshKey 변경은, 로딩 화면을 띄우거나
    // 필터를 초기화하지 않고 조용히 다시 읽어온다 — 그래야 그리드가 스크롤 위치를 유지한다.
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- type 변경(load 재생성)은 위쪽 effect가 이미 처리한다. 여기서까지 반응하면 중복 로딩된다
  }, [refreshKey])

  const genreOptions = useMemo(() => {
    const all = new Set<string>()
    items.forEach((entry) => itemGenres(entry).forEach((g) => all.add(g)))
    return Array.from(all).sort()
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = items

    if (q) result = result.filter((entry) => searchableText(entry).includes(q))
    if (genreFilter.length > 0) {
      result = result.filter((entry) => itemGenres(entry).some((g) => genreFilter.includes(g)))
    }
    if (originFilter.length > 0 && originFilter.length < ORIGINS.length) {
      result = result.filter(
        (entry) =>
          entry.item.type === 'book' &&
          originFilter.includes(categoryOrigin(entry.item.metadata.category) ?? '')
      )
    }
    if (wishlistOnly) {
      result = result.filter((entry) => entry.record && isWishlisted(entry.record.tags))
    }
    if (watchingOnly) {
      result = result.filter((entry) => entry.record && isWatching(entry.record.tags))
    }
    if (finishedOnly) {
      result = result.filter(
        (entry) => entry.item.type === 'webtoon' && entry.item.metadata.isFinished
      )
    }

    const parseDate = (value: string | null | undefined): number => {
      if (!value) return 0
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? 0 : parsed
    }
    const compare: Record<SortKey, (a: ContentListItem, b: ContentListItem) => number> = {
      custom: (a, b) =>
        (a.item.displayOrder ?? MISSING_ORDER) - (b.item.displayOrder ?? MISSING_ORDER),
      added_desc: (a, b) => Date.parse(b.item.createdAt) - Date.parse(a.item.createdAt),
      added_asc: (a, b) => Date.parse(a.item.createdAt) - Date.parse(b.item.createdAt),
      rating_desc: (a, b) => (b.record?.myRating ?? 0) - (a.record?.myRating ?? 0),
      rating_asc: (a, b) => (a.record?.myRating ?? 0) - (b.record?.myRating ?? 0),
      watched_desc: (a, b) =>
        parseDate(b.record?.lastWatchedAt) - parseDate(a.record?.lastWatchedAt),
      watch_count_desc: (a, b) => (b.record?.watchCount ?? 0) - (a.record?.watchCount ?? 0)
    }
    return [...result].sort((a, b) => {
      const primary = compare[sort](a, b)
      return primary !== 0 ? primary : a.item.title.localeCompare(b.item.title, 'ko')
    })
  }, [items, query, genreFilter, originFilter, wishlistOnly, watchingOnly, finishedOnly, sort])

  async function toggleWishlist(entry: ContentListItem): Promise<void> {
    const record = entry.record
    if (!record) return
    const next = isWishlisted(record.tags)
      ? withoutStatusTags(record.tags)
      : [...withoutStatusTags(record.tags), '보고 싶음']
    setItems((prev) =>
      prev.map((e) =>
        e.item.id === entry.item.id ? { ...e, record: { ...record, tags: next } } : e
      )
    )
    try {
      await updateUserRecord(record.id, { tags: next })
    } catch (err) {
      setError(errorMessage(err))
      load()
    }
  }

  async function toggleWatching(entry: ContentListItem): Promise<void> {
    const record = entry.record
    if (!record) return
    const next = isWatching(record.tags)
      ? withoutStatusTags(record.tags)
      : [...withoutStatusTags(record.tags), '보는 중']
    setItems((prev) =>
      prev.map((e) =>
        e.item.id === entry.item.id ? { ...e, record: { ...record, tags: next } } : e
      )
    )
    try {
      await updateUserRecord(record.id, { tags: next })
    } catch (err) {
      setError(errorMessage(err))
      load()
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <MagnifyingGlass size={14} color={colors.neutral500} style={styles.searchIcon} />
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="보관된 콘텐츠 검색"
              style={{ paddingLeft: 30 }}
            />
          </View>
          <Pressable style={styles.iconButton} onPress={onOpenSettings}>
            <Gear size={19} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, alignItems: 'center', paddingRight: 4 }}
            style={{ flex: 1 }}
          >
            <FilterChip
              label={
                genreFilter.length > 0
                  ? `${config.filterLabel} (${genreFilter.length})`
                  : config.filterLabel
              }
              active={genreFilter.length > 0}
              caret
              onPress={() => setSheet('genre')}
            />
            {type === 'webtoon' ? (
              <FilterChip
                label="완결작"
                active={finishedOnly}
                onPress={() => setFinishedOnly((v) => !v)}
              />
            ) : null}
            {type === 'book'
              ? ORIGINS.map((origin) => (
                  <FilterChip
                    key={origin}
                    label={origin}
                    active={originFilter.includes(origin)}
                    onPress={() =>
                      setOriginFilter((prev) =>
                        prev.includes(origin) ? prev.filter((o) => o !== origin) : [...prev, origin]
                      )
                    }
                  />
                ))
              : null}
            <FilterChip
              label="보고 싶어요"
              icon="heart"
              active={wishlistOnly}
              onPress={() => setWishlistOnly((v) => !v)}
            />
            <FilterChip
              label="보는 중"
              icon="eye"
              active={watchingOnly}
              onPress={() => setWatchingOnly((v) => !v)}
            />
          </ScrollView>
          <FilterChip
            label={SORTS.find((s) => s.value === sort)?.label ?? ''}
            filled
            caret
            onPress={() => setSheet('sort')}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: colors.danger }}>{error}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {items.length === 0
              ? `아직 보관된 ${config.label}이 없어요.\n아래 "검색 · 추가"에서 추가해보세요.`
              : '조건에 맞는 항목이 없어요.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.neutral500}
              onRefresh={() => {
                setRefreshing(true)
                load().finally(() => setRefreshing(false))
              }}
            />
          }
        >
          {filtered.map((entry) => {
            const wish = entry.record ? isWishlisted(entry.record.tags) : false
            const watching = entry.record ? isWatching(entry.record.tags) : false
            return (
              <Pressable
                key={entry.item.id}
                style={styles.card}
                onPress={() => onSelect(entry.item.id)}
              >
                <Poster
                  url={entry.item.posterUrl}
                  backgroundUrl={
                    entry.item.type === 'webtoon' ? entry.item.metadata.backgroundImageUrl : null
                  }
                  style={styles.cardPoster}
                >
                  {wish ? (
                    <View style={styles.wishBadge}>
                      <Chip label="보고 싶어요" variant="accent2" />
                    </View>
                  ) : null}
                </Poster>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {entry.item.title}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {itemSubtitle(entry)}
                </Text>
                <View style={styles.cardFooter}>
                  <StarRating rating={entry.record?.myRating ?? null} size={9.5} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pressable onPress={() => toggleWishlist(entry)} hitSlop={8}>
                      <Heart
                        size={11}
                        weight={wish ? 'fill' : 'regular'}
                        color={wish ? colors.accent : '#fff'}
                      />
                    </Pressable>
                    <Pressable onPress={() => toggleWatching(entry)} hitSlop={8}>
                      <Eye
                        size={11}
                        weight={watching ? 'fill' : 'regular'}
                        color={watching ? colors.accent : '#fff'}
                      />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      <PickerSheet
        visible={sheet === 'genre'}
        title={config.filterLabel}
        multiple
        columns={3}
        options={genreOptions.map((g) => ({ value: g, label: g }))}
        selected={genreFilter}
        onToggle={(value) =>
          setGenreFilter((prev) =>
            prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
          )
        }
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'sort'}
        title="정렬"
        columns={2}
        options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
        selected={[sort]}
        onToggle={(value) => setSort(value as SortKey)}
        onClose={() => setSheet(null)}
      />
    </View>
  )
}

function FilterChip({
  label,
  active,
  caret,
  icon,
  filled,
  onPress
}: {
  label: string
  active?: boolean
  caret?: boolean
  icon?: 'heart' | 'eye'
  filled?: boolean
  onPress: () => void
}): React.JSX.Element {
  const Icon = icon === 'eye' ? Eye : icon === 'heart' ? Heart : null
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        filled && { backgroundColor: colors.neutral800 },
        active && { borderColor: colors.accent, backgroundColor: colors.accent900 }
      ]}
    >
      {Icon ? (
        <Icon
          size={12}
          weight={active ? 'fill' : 'regular'}
          color={active ? colors.accent : '#fff'}
        />
      ) : null}
      <Text style={{ fontSize: 12, color: active ? colors.accent : colors.text }}>{label}</Text>
      {caret ? <CaretDown size={10} color={active ? colors.accent : colors.text} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 10, gap: 12 },
  searchIcon: { position: 'absolute', left: 10, zIndex: 1 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: radius.md * 0.75,
    borderWidth: 1,
    borderColor: colors.divider
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.neutral500, textAlign: 'center', lineHeight: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18
  },
  // 3열 그리드: 가로 여백(18*2)과 칸 사이 간격(10*2)을 뺀 나머지를 3등분
  card: { width: '31%', gap: 7 },
  cardPoster: { width: '100%', aspectRatio: 2 / 3 },
  wishBadge: { position: 'absolute', top: 6, left: 6 },
  cardTitle: { fontSize: 12, fontWeight: '500', color: colors.text, lineHeight: 16 },
  cardSub: { fontSize: 10, color: colors.neutral500, marginTop: -4 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2
  }
})
