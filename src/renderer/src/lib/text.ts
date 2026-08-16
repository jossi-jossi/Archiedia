// 네이버/카카오 API가 내려주는 줄거리 텍스트에는 자기네 화면 폭에 맞춘 개행(\n, \r)이나
// Line/Paragraph Separator(U+2028, U+2029) 같은 강제 줄바꿈 문자가 섞여 있을 때가 있다.
// 모바일 RN Text는 이걸 항상 그대로 강제 줄바꿈으로 렌더링해서 문장 중간의 엉뚱한 자리에서
// 줄이 끊겨 보인다. 공백 하나로 합쳐서 화면 폭에 맞게 다시 흐르게 한다.
const LINE_BREAK_CHARS = /[\r\n\u2028\u2029]+/g
const EXTRA_SPACES = /\s+/g

export function normalizeOverview(text: string | null | undefined): string | null {
  if (!text) return null
  const normalized = text.replace(LINE_BREAK_CHARS, ' ').replace(EXTRA_SPACES, ' ').trim()
  return normalized || null
}
