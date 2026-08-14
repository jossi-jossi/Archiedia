import type { ContentType } from '@archiedia/schema'

// 디자인 시안의 TYPES 상수와 같은 구성. 화면 하나를 이 표로 파라미터화한다.
export interface TypeConfig {
  key: ContentType
  label: string
  placeholder: string
  filterLabel: string
  countLabel: string
  mediumLabel: string
  dateLabel: string
  mediumPlaceholder: string
  overviewLabel: string
}

export const TYPES: TypeConfig[] = [
  {
    key: 'movie',
    label: '영화',
    placeholder: 'TMDB에서 영화 검색',
    filterLabel: '장르',
    countLabel: '시청 횟수',
    mediumLabel: '시청 매체',
    dateLabel: '마지막 시청일',
    mediumPlaceholder: '극장 / OTT / 블루레이 등',
    overviewLabel: '줄거리'
  },
  {
    key: 'drama',
    label: '시리즈',
    placeholder: 'TMDB에서 시리즈 검색',
    filterLabel: '장르',
    countLabel: '시청 횟수',
    mediumLabel: '시청 매체',
    dateLabel: '마지막 시청일',
    mediumPlaceholder: '극장 / OTT / 블루레이 등',
    overviewLabel: '줄거리'
  },
  {
    key: 'webtoon',
    label: '웹툰',
    placeholder: '네이버웹툰·카카오웹툰에서 검색',
    filterLabel: '장르',
    countLabel: '읽은 횟수',
    mediumLabel: '읽은 매체',
    dateLabel: '마지막 읽은 날',
    mediumPlaceholder: '네이버웹툰 앱 / PC 등',
    overviewLabel: '줄거리'
  },
  {
    key: 'book',
    label: '책',
    placeholder: '알라딘에서 책 검색',
    filterLabel: '카테고리',
    countLabel: '읽은 횟수',
    mediumLabel: '읽은 매체',
    dateLabel: '마지막 읽은 날',
    mediumPlaceholder: '종이책 / eBook 등',
    overviewLabel: '요약'
  }
]

export function typeConfig(key: ContentType): TypeConfig {
  return TYPES.find((t) => t.key === key) ?? TYPES[0]
}
