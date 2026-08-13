import type { WebtoonMetadata } from '@archiedia/schema'
import {
  getWebtoonDetails as getKakaoDetails,
  searchWebtoons as searchKakao
} from '../../lib/kakaoWebtoon'
import { getWebtoonDetails as getNaverDetails } from '../../lib/naverWebtoon'
import { refetchWebtoon, Webtoon, WebtoonListItem } from './api'

const STALE_MS = 24 * 60 * 60 * 1000

// 연재 중인 작품만 대상으로, 마지막 동기화 후 STALE_MS 이상 지난 것만 다시 받아온다.
// 완결작은 화수/썸네일이 더 이상 안 바뀌니 건드릴 필요가 없다.
function isStale(item: Webtoon): boolean {
  if (item.metadata.isFinished) return false
  if (!item.externalId) return false
  const last = item.metadata.lastSyncedAt
  if (!last) return true
  return Date.now() - Date.parse(last) > STALE_MS
}

export interface WebtoonSyncPatch {
  title: string
  posterUrl: string | null
  metadata: WebtoonMetadata
}

// 라이브러리 화면을 열 때 백그라운드에서 조용히 실행된다. 하나씩 순차 요청해서 원본
// 사이트에 부담을 주지 않고, 개별 항목이 실패해도(예: 카카오 제목 재검색 매칭 실패)
// 전체를 멈추지 않고 다음 항목으로 넘어간다.
export async function syncStaleOngoingWebtoons(
  items: WebtoonListItem[],
  onUpdated: (id: string, patch: WebtoonSyncPatch) => void
): Promise<void> {
  const targets = items.map((w) => w.item).filter(isStale)

  for (const item of targets) {
    try {
      let patch: WebtoonSyncPatch
      if (item.source === 'naver') {
        patch = await getNaverDetails(Number(item.externalId))
      } else if (item.source === 'kakao') {
        const results = await searchKakao(item.title)
        const match = results.find((r) => String(r.id) === item.externalId)
        if (!match) continue
        patch = await getKakaoDetails(match)
      } else {
        continue
      }
      await refetchWebtoon(item.id, patch)
      onUpdated(item.id, patch)
    } catch {
      // 백그라운드 동기화라 개별 실패는 조용히 넘어간다
    }
  }
}
