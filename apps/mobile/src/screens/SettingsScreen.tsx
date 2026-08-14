import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, BookOpen, FilmSlate, Layout, SignOut, Television } from 'phosphor-react-native'
import type { ContentType } from '@archiedia/schema'
import { colors, radius } from '../theme'
import { countByType } from '../features/content'
import { TYPES } from '../features/types'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'

const ICONS = {
  movie: FilmSlate,
  drama: Television,
  webtoon: Layout,
  book: BookOpen
} as const

interface Props {
  onBack: () => void
}

export function SettingsScreen({ onBack }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets()
  const [counts, setCounts] = useState<Partial<Record<ContentType, number>>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all(TYPES.map(async (t) => [t.key, await countByType(t.key)] as const))
      .then((entries) => setCounts(Object.fromEntries(entries)))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={16} color={colors.text} />
        <Text style={{ color: colors.text, fontSize: 14 }}>설정</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>보관 현황</Text>
      <View style={styles.card}>
        {TYPES.map((t, i) => {
          const Icon = ICONS[t.key as keyof typeof ICONS]
          return (
            <View
              key={t.key}
              style={[styles.row, i === TYPES.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Icon size={17} color={colors.neutral400} />
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{t.label}</Text>
              <Text style={{ fontSize: 13, color: colors.neutral500 }}>{counts[t.key] ?? 0}개</Text>
            </View>
          )
        })}
      </View>

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <SignOut size={16} color={colors.text} />
        <Text style={{ color: colors.text, fontSize: 14 }}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 28 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 18,
    alignSelf: 'flex-start'
  },
  sectionLabel: { fontSize: 12, color: colors.neutral500, marginBottom: 8, paddingHorizontal: 2 },
  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 24
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  signOut: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  }
})
