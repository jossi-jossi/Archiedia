// 네이버웹툰과 카카오웹툰은 장르를 다른 방식으로 준다.
//
//   네이버: 작품당 1~3개, 원자적            예) 판타지 / 액션 / 무협·사극
//   카카오: 작품당 1개, 복합 라벨            예) 로맨스 판타지 / 액션·무협 / 코믹·일상
//
// 그대로 두면 "로맨스"와 "로맨스 판타지"가 필터에서 별개 항목이 돼서, 로맨스로 걸러도
// 로맨스판타지 작품이 빠진다. 그래서 복합 라벨을 원자 단위로 쪼개고 표기를 통일한다.
// 저장된 값이 아니라 화면에 쓸 때 변환해서 이미 보관된 작품에도 바로 적용된다.

// 슬래시가 없어서 기계적으로 못 쪼개는 카카오 복합 라벨.
const COMPOUND_GENRES: Record<string, string[]> = {
  '로맨스 판타지': ['로맨스', '판타지'],
  '판타지 드라마': ['판타지', '드라마']
}

// 두 플랫폼이 같은 장르를 다르게 부르는 것.
const GENRE_ALIASES: Record<string, string> = {
  코믹: '개그'
}

export function normalizeGenres(genres: string[]): string[] {
  const result = genres.flatMap((genre) => {
    const trimmed = genre.trim()
    const parts = COMPOUND_GENRES[trimmed] ?? trimmed.split('/')
    return parts.map((p) => p.trim()).filter(Boolean)
  })
  return Array.from(new Set(result.map((g) => GENRE_ALIASES[g] ?? g)))
}
