// 데스크톱 앱의 nocturne.css + accent-override.css와 같은 값. RN은 CSS 변수도 oklch()도
// 못 쓰기 때문에, 연두색 액센트 램프는 원본 oklch 값을 sRGB로 변환해서 박아뒀다.
// (변환 기준: oklch(L C 128) → sRGB, 예: accent = oklch(0.74 0.17 128) = #8bbe36)

export const colors = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  // color-mix(in srgb, #e9e9ed 16%, transparent)를 불투명 색으로 근사한 값.
  divider: 'rgba(233, 233, 237, 0.16)',

  accent: '#8bbe36',
  accent2: '#9fc271',
  accent100: '#eefae1',
  accent200: '#dbf1c3',
  accent300: '#c1e19a',
  accent400: '#a3cf68',
  accent500: '#8bbe36',
  accent600: '#6a9708',
  accent700: '#4b6d00',
  accent800: '#2e4600',
  accent900: '#152200',

  accent2_100: '#eff9e4',
  accent2_800: '#34431f',

  neutral100: '#f3f5fe',
  neutral200: '#e4e7f5',
  neutral300: '#cfd3e5',
  neutral400: '#b2b6ca',
  neutral500: '#9397ab',
  neutral600: '#75798c',
  neutral700: '#595d6c',
  neutral800: '#3f424d',
  neutral900: '#292b31',

  danger: '#e08a8a'
} as const

export const radius = {
  sm: 4,
  md: 8,
  lg: 14
} as const

// 포스터 자리 표시자(데스크톱의 repeating-linear-gradient 대신 단색 블록으로 단순화)
export const posterPlaceholder = colors.neutral900
