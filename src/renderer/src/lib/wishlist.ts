export function withoutStatusTags(tags: string[]): string[] {
  return tags.filter(
    (t) => t !== '보고 싶음' && t !== '보고싶음' && t !== '보는 중' && !/^\d+번 봄$/.test(t)
  )
}

export function isWishlisted(tags: string[]): boolean {
  return tags.includes('보고 싶음') || tags.includes('보고싶음')
}

// 보고 싶어요/보는 중은 서로 배타적인 상태다 — withoutStatusTags가 저장 전에 항상 둘 다
// 지우고 하나만 다시 넣는 방식으로 배타성을 보장한다.
export function isWatching(tags: string[]): boolean {
  return tags.includes('보는 중')
}

// 저장되는 태그 값은 '보고 싶음'(과거 데이터 호환용 '보고싶음')이지만, 화면 표시 문구는 통일한다.
export function displayTag(tag: string): string {
  return tag === '보고 싶음' || tag === '보고싶음' ? '보고 싶어요' : tag
}
