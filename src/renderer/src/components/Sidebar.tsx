import { FilmStrip, MagnifyingGlass, SignOut, SquaresFour } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'

export type Screen = 'library' | 'add'

interface Props {
  screen: Screen
  movieCount: number
  onNavigate: (screen: 'library' | 'add') => void
}

function navItemStyle(active: boolean): React.CSSProperties {
  return active
    ? {
        color: 'var(--color-accent)',
        background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
      }
    : { color: 'var(--color-text)' }
}

export function Sidebar({ screen, movieCount, onNavigate }: Props): React.JSX.Element {
  return (
    <div
      style={{
        width: 220,
        flex: 'none',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        gap: 22,
        borderRight: '1px solid var(--color-divider)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
        <FilmStrip size={20} weight="fill" color="var(--color-accent)" />
        <div className="nav-brand" style={{ fontSize: 17 }}>
          아키디아
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          onClick={() => onNavigate('library')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            cursor: 'pointer',
            ...navItemStyle(screen === 'library')
          }}
        >
          <SquaresFour size={17} />
          <span>라이브러리</span>
        </div>
        <div
          onClick={() => onNavigate('add')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            cursor: 'pointer',
            ...navItemStyle(screen === 'add')
          }}
        >
          <MagnifyingGlass size={17} />
          <span>검색 · 추가</span>
        </div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'color-mix(in srgb, var(--color-text) 4%, transparent)',
            fontSize: 11,
            color: 'var(--color-neutral-500)',
            lineHeight: 1.5
          }}
        >
          영화 {movieCount}편 보관 중
          <br />
          1차 지원 타입: 영화
        </div>
        <div
          onClick={() => supabase.auth.signOut()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--color-neutral-500)',
            cursor: 'pointer'
          }}
        >
          <SignOut size={15} />
          로그아웃
        </div>
      </div>
    </div>
  )
}
