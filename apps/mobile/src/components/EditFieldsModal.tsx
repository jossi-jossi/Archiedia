import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { colors, radius } from '../theme'
import { Field, Input } from './ui'
import { errorMessage } from '../lib/errors'

export interface EditField {
  key: string
  label: string
  value: string
  multiline?: boolean
  placeholder?: string
}

interface Props {
  visible: boolean
  title: string
  fields: EditField[]
  onSave: (values: Record<string, string>) => Promise<void>
  onClose: () => void
}

// 영화/시리즈의 감독·출연·줄거리, 책의 제목·요약처럼 콘텐츠 자체의 정보를 고치는 화면에
// 공통으로 쓴다. fields만 종류별로 다르게 넘기면 된다.
export function EditFieldsModal({
  visible,
  title,
  fields,
  onSave,
  onClose
}: Props): React.JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 모달이 열릴 때마다 최신 필드값으로 폼을 다시 채운다
      setValues(Object.fromEntries(fields.map((f) => [f.key, f.value])))
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fields는 매 렌더 새 배열이라 visible에만 반응한다
  }, [visible])

  async function handleSave(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      await onSave(values)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {/*
            스크롤바가 시트 안쪽 padding에 밀려 붕 뜬 자리에 그려지지 않도록, 가로 여백을
            ScrollView 자신이 아니라 contentContainerStyle(내용)에 줘서 ScrollView는 시트
            전체 폭을 쓰고 스크롤바는 상세팝업처럼 진짜 가장자리에 딱 붙게 한다.
          */}
          <ScrollView
            style={{ flexShrink: 1, marginHorizontal: -18 }}
            contentContainerStyle={{ gap: 14, paddingHorizontal: 18 }}
            keyboardShouldPersistTaps="handled"
            indicatorStyle="white"
          >
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  value={values[f.key] ?? ''}
                  placeholder={f.placeholder}
                  multiline={f.multiline}
                  onChangeText={(text) => setValues((prev) => ({ ...prev, [f.key]: text }))}
                />
              </Field>
            ))}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              style={[styles.row, { flex: 1 }]}
              onPress={() => !saving && onClose()}
              disabled={saving}
            >
              <Text style={{ fontSize: 15, color: colors.text }}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.primary, { flex: 1 }, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>{saving ? '저장 중...' : '저장'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    // 키보드가 올라와서 KeyboardAvoidingView가 이 영역을 눌러 줄어들 때, 제목/버튼은
    // 고정 크기를 유지하고 가운데 ScrollView(flexShrink)만 줄어들어야 제목이 화면 위로
    // 밀려나지 않는다. maxHeight는 키보드 없이 열렸을 때 너무 길어지는 것만 막는 안전장치.
    maxHeight: '85%',
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14
  },
  title: { fontSize: 16, fontWeight: '500', color: colors.text, textAlign: 'center' },
  error: { fontSize: 13, color: colors.danger },
  row: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primary: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryText: { color: colors.accent900, fontSize: 15, fontWeight: '600' }
})
