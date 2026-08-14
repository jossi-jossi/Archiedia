import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BookOpen, FilmSlate, Layout, MagnifyingGlass, Television } from 'phosphor-react-native'
import type { ContentType } from '@archiedia/schema'
import { colors } from '../theme'
import { TYPES } from '../features/types'

const ICONS = {
  movie: FilmSlate,
  drama: Television,
  webtoon: Layout,
  book: BookOpen
} as const

interface Props {
  screen: 'library' | 'add'
  type: ContentType
  onSelectType: (type: ContentType) => void
  onSelectAdd: () => void
}

export function BottomTabs({ screen, type, onSelectType, onSelectAdd }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TYPES.map((t) => {
        const Icon = ICONS[t.key as keyof typeof ICONS]
        const active = screen === 'library' && t.key === type
        return (
          <Pressable key={t.key} style={styles.tab} onPress={() => onSelectType(t.key)}>
            <Icon
              size={20}
              weight={active ? 'fill' : 'regular'}
              color={active ? colors.accent : colors.neutral500}
            />
            <Text style={[styles.label, { color: active ? colors.accent : colors.neutral500 }]}>
              {t.label}
            </Text>
          </Pressable>
        )
      })}
      <Pressable style={styles.tab} onPress={onSelectAdd}>
        <MagnifyingGlass
          size={20}
          weight={screen === 'add' ? 'fill' : 'regular'}
          color={screen === 'add' ? colors.accent : colors.neutral500}
        />
        <Text
          style={[styles.label, { color: screen === 'add' ? colors.accent : colors.neutral500 }]}
        >
          검색 · 추가
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    paddingTop: 8,
    paddingHorizontal: 4
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3
  },
  label: {
    fontSize: 10
  }
})
