import { EnvelopeSimple } from '@phosphor-icons/react'
import { FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'
import archiediaLogo from '../../assets/archiedia-logo.svg'

export function LoginScreen(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function signIn(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) setError(error.message)
  }

  async function signUp(): Promise<void> {
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setInfo('가입 확인 이메일을 보냈어요. 메일함을 확인해주세요.')
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <form
        onSubmit={signIn}
        style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 9 }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            marginBottom: 3
          }}
        >
          <img src={archiediaLogo} alt="아키디아" style={{ height: 132, width: 'auto' }} />
          <div style={{ fontSize: 15, color: 'var(--color-text)', textAlign: 'center' }}>
            영화 · 시리즈 · 웹툰 · 책 기록을 한곳에
          </div>
        </div>

        <div className="field">
          <label>이메일</label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ fontSize: 13 }}
          />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ fontSize: 13 }}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: '#e08a8a' }}>{error}</div>}
        {info && <div style={{ fontSize: 13, color: 'var(--color-accent)' }}>{info}</div>}

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={submitting}
          style={{
            background: 'var(--color-accent)',
            borderColor: 'var(--color-accent)',
            color: 'var(--color-accent-900)',
            fontWeight: 600,
            fontSize: 13
          }}
        >
          {submitting ? '처리 중...' : '로그인'}
        </button>

        <div className="hr" style={{ margin: '3px 0' }} />

        <button
          className="btn btn-secondary btn-block"
          type="button"
          disabled={submitting}
          onClick={signUp}
          style={{ fontSize: 13, marginTop: 0 }}
        >
          <EnvelopeSimple size={15} />
          이메일로 회원가입
        </button>
      </form>
    </div>
  )
}
