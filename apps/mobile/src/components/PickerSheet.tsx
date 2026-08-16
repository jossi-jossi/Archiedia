import type { DimensionValue } from 'react-native'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Check } from 'phosphor-react-native'
import { colors, radius } from '../theme'

interface Props {
  visible: boolean
  title: string
  options: { value: string; label: string }[]
  selected: string[]
  multiple?: boolean
  // 장르(3열)·정렬(2열)처럼 쓰는 곳마다 열 수가 달라서 받아서 쓴다.
  columns?: number
  // 정렬처럼 선택된 항목에 체크 표시까지 보여줄지, 장르처럼 색만 바뀌면 될지.
  showCheck?: boolean
  onToggle: (value: string) => void
  onClose: () => void
}

const COLUMN_WIDTH: Record<number, DimensionValue> = {
  1: '100%',
  2: '48%',
  3: '31%'
}

// 장르/카테고리 다중 선택과 정렬 단일 선택에 같이 쓰는 바텀시트. 옵션을 grid 버튼으로 그린다.
export function PickerSheet({
  visible,
  title,
  options,
  selected,
  multiple = false,
  columns = 3,
  showCheck = false,
  onToggle,
  onClose
}: Props): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.length === 0 ? (
              <Text style={styles.empty}>옵션 없음</Text>
            ) : (
              <View style={styles.grid}>
                {options.map((opt) => {
                  const on = selected.includes(opt.value)
                  return (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.gridButton,
                        { width: COLUMN_WIDTH[columns] ?? COLUMN_WIDTH[3] },
                        on && styles.gridButtonActive
                      ]}
                      onPress={() => {
                        onToggle(opt.value)
                        if (!multiple) onClose()
                      }}
                    >
                      <Text
                        style={[styles.gridButtonText, on && { color: colors.accent }]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      {showCheck && on ? (
                        <View style={styles.gridButtonCheck}>
                          <Check size={13} color={colors.accent} weight="bold" />
                        </View>
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 6
  },
  title: { fontSize: 13, color: colors.neutral500, marginBottom: 4 },
  empty: { fontSize: 13, color: colors.neutral500, paddingVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  gridButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: radius.md * 0.75,
    borderWidth: 1,
    borderColor: colors.divider
  },
  gridButtonActive: { borderColor: colors.accent, backgroundColor: colors.accent900 },
  gridButtonText: { fontSize: 13, color: '#fff', flexShrink: 1, textAlign: 'center' },
  gridButtonCheck: { position: 'absolute', right: 8 }
})
