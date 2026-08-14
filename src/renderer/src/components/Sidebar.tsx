import {
  BookOpen,
  DownloadSimple,
  FilmSlate,
  FilmStrip,
  MagnifyingGlass,
  SignOut,
  Television
} from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'

// 만화 컷 분할 레이아웃 아이콘 (사용자 제공 디자인). phosphor 아이콘처럼 currentColor를
// 써서 NavItem의 active/inactive 색이 자동으로 반영되게 한다.
function WebtoonIcon({ size }: { size: number }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeWidth="28"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <rect x="16" y="16" width="480" height="480" rx="16" />
      <polygon points="56,66 300,66 255,208 56,208" />
      <polygon points="320,66 456,66 456,208 280,208" />
      <rect x="56" y="232" width="140" height="126" rx="8" />
      <rect x="220" y="232" width="236" height="126" rx="8" />
      <rect x="56" y="380" width="400" height="64" rx="8" />
    </svg>
  )
}

export type Screen = 'library' | 'series' | 'webtoon' | 'book' | 'add' | 'import'

interface Props {
  screen: Screen
  movieCount: number
  seriesCount: number
  webtoonCount: number
  bookCount: number
  onNavigate: (screen: Screen) => void
}

function navItemStyle(active: boolean): React.CSSProperties {
  return active
    ? {
        color: 'var(--color-accent)',
        background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
      }
    : { color: 'var(--color-text)' }
}

function NavItem({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: 14,
        cursor: 'pointer',
        ...navItemStyle(active)
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

export function Sidebar({
  screen,
  movieCount,
  seriesCount,
  webtoonCount,
  bookCount,
  onNavigate
}: Props): React.JSX.Element {
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
        <NavItem
          active={screen === 'library'}
          icon={<FilmSlate size={17} />}
          label="영화"
          onClick={() => onNavigate('library')}
        />
        <NavItem
          active={screen === 'series'}
          icon={<Television size={17} />}
          label="시리즈"
          onClick={() => onNavigate('series')}
        />
        <NavItem
          active={screen === 'webtoon'}
          icon={<WebtoonIcon size={17} />}
          label="웹툰"
          onClick={() => onNavigate('webtoon')}
        />
        <NavItem
          active={screen === 'book'}
          icon={<BookOpen size={17} />}
          label="책"
          onClick={() => onNavigate('book')}
        />
        <NavItem
          active={screen === 'add'}
          icon={<MagnifyingGlass size={17} />}
          label="검색 · 추가"
          onClick={() => onNavigate('add')}
        />
        <NavItem
          active={screen === 'import'}
          icon={<DownloadSimple size={17} />}
          label="왓챠 가져오기"
          onClick={() => onNavigate('import')}
        />
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
          영화 {movieCount}편 · 시리즈 {seriesCount}편 · 웹툰 {webtoonCount}편 · 책 {bookCount}권
          보관 중
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
