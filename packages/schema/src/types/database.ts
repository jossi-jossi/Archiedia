// supabase/schema.sql 과 1:1로 대응하는 raw row 타입 (snake_case, Supabase 응답 그대로)

export interface ContentItemRow {
  id: string
  user_id: string
  type: string
  title: string
  source: string
  external_id: string | null
  poster_url: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface UserRecordRow {
  id: string
  user_id: string
  content_item_id: string
  my_rating: number | null
  my_review: string | null
  watch_count: number
  last_watched_at: string | null
  watch_medium: string | null
  tags: string[]
  updated_at: string
}
