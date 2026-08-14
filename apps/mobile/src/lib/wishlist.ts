export function withoutStatusTags(tags: string[]): string[] {
  return tags.filter((t) => t !== '보고 싶음' && t !== '보고싶음' && !/^\d+번 봄$/.test(t))
}

export function isWishlisted(tags: string[]): boolean {
  return tags.includes('보고 싶음') || tags.includes('보고싶음')
}
