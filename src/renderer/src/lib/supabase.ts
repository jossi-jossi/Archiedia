import { createSupabaseClient } from '@archiedia/schema'

export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Supabase 무료 프로젝트는 7일간 요청이 없으면 일시정지되므로, 앱 실행 시 가벼운 요청을 보내 활성 상태를 유지한다.
export async function pingSupabase(): Promise<void> {
  const { error } = await supabase.from('content_items').select('id').limit(1)
  if (error) {
    console.warn('[supabase] healthcheck ping failed:', error.message)
  }
}
