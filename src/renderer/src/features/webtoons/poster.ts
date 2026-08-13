// 카카오웹툰 카드는 배경 삽화(backgroundImageUrl) 위에 캐릭터 이미지(posterUrl)를 얹는
// 2겹 구조다. 캐릭터 이미지(featuredCharacterImageA)는 인물 전체가 여백까지 포함해서
// 온전히 들어간 그림이라, contain 그대로 두면 카드보다 여백이 많아 작아 보인다. 가로 기준
// CHARACTER_ZOOM만큼 키우고(세로는 비율대로 같이 커짐) 카드 아래쪽 테두리에 붙여서 인물이
// 바닥에 서있는 것처럼 보이게 한다. 배경 삽화는 위쪽 일부만 그림이고 나머지는 단색이라
// top으로 고정한다.
// 네이버는 완성된 포스터 이미지 한 장뿐이라 기존처럼 cover로 꽉 채운다.
const CHARACTER_ZOOM = '140%'

export function webtoonPosterFill(
  posterUrl: string | null,
  backgroundImageUrl?: string | null
): React.CSSProperties {
  if (backgroundImageUrl) {
    const layers = posterUrl
      ? [
          { url: posterUrl, size: `${CHARACTER_ZOOM} auto`, position: 'center bottom' },
          { url: backgroundImageUrl, size: 'cover', position: 'center top' }
        ]
      : [{ url: backgroundImageUrl, size: 'cover', position: 'center top' }]

    return {
      backgroundImage: layers.map((l) => `url(${l.url})`).join(', '),
      backgroundSize: layers.map((l) => l.size).join(', '),
      backgroundPosition: layers.map((l) => l.position).join(', '),
      backgroundRepeat: 'no-repeat'
    }
  }
  return {
    background: posterUrl
      ? `center / cover no-repeat url(${posterUrl})`
      : 'repeating-linear-gradient(45deg, var(--color-neutral-800), var(--color-neutral-800) 8px, var(--color-neutral-900) 8px, var(--color-neutral-900) 16px)'
  }
}
