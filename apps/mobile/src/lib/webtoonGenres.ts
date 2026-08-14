// 데스크톱 src/renderer/src/features/webtoons/genres.ts와 같은 규칙.
// 네이버는 원자적 장르를, 카카오는 복합 라벨 하나를 주기 때문에 쪼개고 표기를 맞춘다.

const COMPOUND_GENRES: Record<string, string[]> = {
  '로맨스 판타지': ['로맨스', '판타지'],
  '판타지 드라마': ['판타지', '드라마']
}

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

// 카카오는 해시태그를 "#로맨스"처럼 주고 네이버는 안 붙여서 준다.
export function stripHash(tag: string): string {
  return tag.replace(/^#/, '')
}
