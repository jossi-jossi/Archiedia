import { FilmStrip } from '@phosphor-icons/react'
import { FormEvent, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function LoginScreen(): React.JSX.Element {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    if (mode === 'signup') {
      setInfo('가입 확인 이메일을 보냈어요. 메일함을 확인해주세요.')
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent 60%)'
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6
          }}
        >
          <FilmStrip size={34} weight="fill" color="var(--color-accent)" />
          <h2 style={{ margin: 0 }}>아키디아</h2>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-500)', textAlign: 'center' }}>
            여러 플랫폼의 콘텐츠 기록을 한곳에
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
          />
        </div>

        {error && <div style={{ fontSize: 13, color: '#e08a8a' }}>{error}</div>}
        {info && <div style={{ fontSize: 13, color: 'var(--color-accent)' }}>{info}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {mode === 'signin' ? '로그인' : '회원가입'}
        </button>

        <div className="hr" style={{ margin: '6px 0' }} />

        <button
          className="btn btn-secondary btn-block"
          type="button"
          disabled
          title="추후 지원 예정"
        >
          왓챠피디아 계정 연동
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-neutral-500)' }}>
          {mode === 'signin' ? (
            <>
              계정이 없으신가요?{' '}
              <a href="#" onClick={(e) => (e.preventDefault(), setMode('signup'))}>
                회원가입
              </a>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <a href="#" onClick={(e) => (e.preventDefault(), setMode('signin'))}>
                로그인
              </a>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
