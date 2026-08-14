import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createSupabaseClient } from '@archiedia/schema'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// 값이 없으면 supabase-js가 "supabaseUrl is required"라는 원인을 알기 어려운 오류를 던진다.
// .env를 안 만들었을 때가 대부분이라 무엇을 해야 하는지 알려준다.
if (!url || !anonKey) {
  throw new Error(
    'apps/mobile/.env가 없거나 값이 비어 있어요. .env.example을 복사해서 EXPO_PUBLIC_* 값을 채운 뒤 개발 서버를 다시 시작해주세요.'
  )
}

// RN에는 localStorage가 없어서 세션 저장소를 직접 넘겨야 앱을 껐다 켜도 로그인이 유지된다.
// detectSessionInUrl은 URL 콜백이 없는 네이티브에서 꺼둔다.
export const supabase = createSupabaseClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})
