import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createSupabaseClient } from '@archiedia/schema'

// RN에는 localStorage가 없어서 세션 저장소를 직접 넘겨야 앱을 껐다 켜도 로그인이 유지된다.
// detectSessionInUrl은 URL 콜백이 없는 네이티브에서 꺼둔다.
export const supabase = createSupabaseClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
)
