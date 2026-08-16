import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { EnvelopeSimple } from 'phosphor-react-native'
import { colors, radius } from '../theme'
import { Field, Input } from '../components/ui'
import { AppLogo } from '../components/AppLogo'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'

export function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function signIn(): Promise<void> {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      // 성공하면 onAuthStateChange가 App 쪽 세션을 갱신해서 화면이 바뀐다.
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function signUp(): Promise<void> {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError
      setNotice('가입 확인 메일을 보냈어요. 메일함을 확인해주세요.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AppLogo height={108} />
            <Text style={styles.tagline}>영화 · 시리즈 · 웹툰 · 책 기록을 한곳에</Text>
          </View>

          <Field label="이메일">
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </Field>
          <Field label="비밀번호">
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Pressable
            style={[styles.primary, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={signIn}
          >
            <Text style={styles.primaryText}>{busy ? '처리 중...' : '로그인'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={[styles.secondary, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={signUp}
          >
            <EnvelopeSimple size={16} color={colors.text} />
            <Text style={styles.secondaryText}>이메일로 회원가입</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.bg
  },
  tagline: { fontSize: 16, color: colors.text, textAlign: 'center' },
  error: { fontSize: 13, color: colors.danger },
  notice: { fontSize: 13, color: colors.accent },
  primary: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryText: { color: colors.accent900, fontSize: 15, fontWeight: '600' },
  secondary: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  secondaryText: { color: colors.text, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 }
})
