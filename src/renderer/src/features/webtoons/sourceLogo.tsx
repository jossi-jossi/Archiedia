import naverLogo from '../../assets/naverWebtoonLogo.svg'
import kakaoLogo from '../../assets/kakaoWebtoonLogo.svg'

const LOGOS: Record<'naver' | 'kakao', string> = {
  naver: naverLogo,
  kakao: kakaoLogo
}

const LABELS: Record<'naver' | 'kakao', string> = {
  naver: '네이버웹툰',
  kakao: '카카오웹툰'
}

interface Props {
  source: string
  size: number
  style?: React.CSSProperties
}

// 웹툰 출처(네이버/카카오)를 나타내는 정사각형 로고. source가 웹툰 외 다른 콘텐츠 타입에서
// 흘러들어온 값(예: 'tmdb', 'manual')이면 그릴 게 없으니 아무것도 렌더링하지 않는다.
export function SourceLogo({ source, size, style }: Props): React.JSX.Element | null {
  if (source !== 'naver' && source !== 'kakao') return null

  return (
    <img
      src={LOGOS[source]}
      alt={LABELS[source]}
      title={LABELS[source]}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '22%',
        objectFit: 'cover',
        display: 'block',
        ...style
      }}
    />
  )
}
