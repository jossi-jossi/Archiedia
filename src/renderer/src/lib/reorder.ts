// 사용자 지정순 드래그 재정렬 공용 로직. 영화/시리즈/책/웹툰 라이브러리가 모두 같은
// 방식(이웃한 두 항목의 display_order 중간값)을 쓴다.

// display_order가 아직 없는(마이그레이션 전) 항목은 맨 뒤로 보낸다.
export const MISSING_ORDER = Number.MAX_SAFE_INTEGER

const GAP = 1_000_000

// orderedValues: 옮기는 항목을 뺀 나머지의 display_order를, 화면에 보이는 순서 그대로 넘긴다.
// insertAt: 그 목록에서 새로 끼워 넣을 위치(0-based).
export function computeDisplayOrderForInsert(orderedValues: number[], insertAt: number): number {
  if (orderedValues.length === 0) return 0
  if (insertAt <= 0) return orderedValues[0] - GAP
  if (insertAt >= orderedValues.length) return orderedValues[orderedValues.length - 1] + GAP
  return (orderedValues[insertAt - 1] + orderedValues[insertAt]) / 2
}
