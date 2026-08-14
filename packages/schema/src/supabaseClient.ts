import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js'

// options는 플랫폼별 차이를 넘기는 자리다. 데스크톱(브라우저 환경)은 기본값으로 충분하고,
// 모바일(React Native)은 세션 저장소로 AsyncStorage를 넘겨야 로그인이 유지된다.
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>
): SupabaseClient {
  return createClient(url, anonKey, options)
}
