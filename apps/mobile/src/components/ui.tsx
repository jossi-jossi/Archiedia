import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle
} from 'react-native'
import { Star } from 'phosphor-react-native'
import { colors, radius } from '../theme'

// 네이버/카카오 웹툰 CDN은 Referer 없이 요청하면 막힐 수 있어서 출처별 헤더를 붙인다.
function posterHeaders(url: string | null): Record<string, string> | undefined {
  if (!url) return undefined
  if (url.includes('pstatic.net')) return { Referer: 'https://comic.naver.com/' }
  if (url.includes('kakaocdn.net') || url.includes('kakao.com')) {
    return { Referer: 'https://webtoon.kakao.com/' }
  }
  return undefined
}

// 카카오웹툰 카드는 완성된 포스터 한 장이 아니라 배경 삽화 위에 캐릭터 컷아웃(투명 PNG)을
// 얹는 2겹 구조다. 데스크톱의 features/webtoons/poster.ts와 같은 배치를 RN으로 옮긴 것:
//
//  - 배경: 세로로 긴 카드에 cover로 채운다. 배경 원본이 가로로 넓어서 높이 기준으로
//    맞춰지고, 세로는 잘리지 않는다.
//  - 캐릭터: featuredCharacterImageA는 인물이 여백까지 온전히 들어간 710×600 그림이라
//    그대로 두면 작아 보인다. 가로로 CHARACTER_ZOOM만큼 키우고 카드 바닥에 붙여서
//    인물이 서 있는 것처럼 보이게 한다.
//
// RN에는 background-position이 없어서, 캐릭터를 담는 상자를 원본 비율(710:600)에 맞춘
// 크기로 만들고 bottom에 붙인 뒤 contain으로 그린다. 비율이 다른 이미지가 와도 상자 안에
// 들어가기만 할 뿐 찌그러지지 않는다.
const CHARACTER_ZOOM = 1.4
const CHARACTER_ASPECT = 710 / 600
// backgroundUrl(캐릭터 컷아웃)이 오는 건 웹툰뿐이라, 이 상수는 웹툰의 실측 썸네일
// 비율(480×623)을 따른다 — 다른 타입의 2:3 박스와는 무관하다.
const POSTER_ASPECT = 480 / 623

// 카드 너비 대비 캐릭터 상자 크기(%) — 높이는 카드 높이 기준으로 환산한다.
const CHARACTER_WIDTH_PCT = CHARACTER_ZOOM * 100
const CHARACTER_HEIGHT_PCT = (CHARACTER_ZOOM / CHARACTER_ASPECT) * POSTER_ASPECT * 100
const CHARACTER_LEFT_PCT = -((CHARACTER_ZOOM - 1) / 2) * 100

export function Poster({
  url,
  backgroundUrl,
  style,
  children
}: {
  url: string | null
  backgroundUrl?: string | null
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <View style={[styles.poster, style]}>
      {backgroundUrl ? (
        <>
          <Image
            source={{ uri: backgroundUrl, headers: posterHeaders(backgroundUrl) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {url ? (
            <Image
              source={{ uri: url, headers: posterHeaders(url) }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: `${CHARACTER_LEFT_PCT}%`,
                width: `${CHARACTER_WIDTH_PCT}%`,
                height: `${CHARACTER_HEIGHT_PCT}%`
              }}
              resizeMode="contain"
            />
          ) : null}
        </>
      ) : url ? (
        <Image
          source={{ uri: url, headers: posterHeaders(url) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      {children}
    </View>
  )
}

export function StarRating({
  rating,
  size = 10,
  onRate
}: {
  rating: number | null
  size?: number
  onRate?: (value: number) => void
}): React.JSX.Element {
  const value = rating ?? 0
  return (
    <View style={{ flexDirection: 'row', gap: size > 16 ? 3 : 1 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star size={size} weight="fill" color={n <= value ? colors.accent : colors.neutral700} />
        )
        if (!onRate) return <View key={n}>{star}</View>
        return (
          <Pressable key={n} onPress={() => onRate(n)} hitSlop={4}>
            {star}
          </Pressable>
        )
      })}
    </View>
  )
}

export function Chip({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={[styles.chip, { borderWidth: 1, borderColor: colors.accent }]}>
      <Text style={{ fontSize: 11, color: colors.accent }}>{label}</Text>
    </View>
  )
}

export function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

export function Input(props: React.ComponentProps<typeof TextInput>): React.JSX.Element {
  return (
    <TextInput
      placeholderTextColor={colors.neutral600}
      {...props}
      style={[
        styles.input,
        props.multiline && { minHeight: 84, paddingTop: 10, paddingBottom: 10 },
        props.style
      ]}
    />
  )
}

const styles = StyleSheet.create({
  poster: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.neutral900,
    position: 'relative'
  },
  chip: {
    height: 22,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: radius.md * 0.75,
    alignSelf: 'flex-start'
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.neutral500
  },
  input: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14
  }
})
