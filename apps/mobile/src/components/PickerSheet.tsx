import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { Check } from 'phosphor-react-native'
import { colors, radius } from '../theme'

interface Props {
  visible: boolean
  title: string
  options: { value: string; label: string }[]
  selected: string[]
  multiple?: boolean
  onToggle: (value: string) => void
  onClose: () => void
}

// 장르/카테고리 다중 선택과 정렬 단일 선택에 같이 쓰는 바텀시트.
export function PickerSheet({
  visible,
  title,
  options,
  selected,
  multiple = false,
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
              options.map((opt) => {
                const on = selected.includes(opt.value)
                return (
                  <Pressable
                    key={opt.value}
                    style={styles.row}
                    onPress={() => {
                      onToggle(opt.value)
                      if (!multiple) onClose()
                    }}
                  >
                    <Text style={[styles.rowText, on && { color: colors.accent }]}>
                      {opt.label}
                    </Text>
                    {on ? <Check size={15} color={colors.accent} weight="bold" /> : null}
                  </Pressable>
                )
              })
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11
  },
  rowText: { fontSize: 15, color: colors.text }
})
