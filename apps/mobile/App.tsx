import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import type { ContentType } from '@archiedia/schema'
import { colors } from './src/theme'
import { useSession } from './src/useSession'
import { LoginScreen } from './src/screens/LoginScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { DetailScreen } from './src/screens/DetailScreen'
import { AddScreen } from './src/screens/AddScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { BottomTabs } from './src/components/BottomTabs'

type Screen = 'library' | 'detail' | 'add' | 'settings'

export default function App(): React.JSX.Element {
  const { session, loading } = useSession()

  const [screen, setScreen] = useState<Screen>('library')
  const [type, setType] = useState<ContentType>('movie')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 보관/삭제 후 라이브러리를 다시 읽게 만드는 신호.
  const [refreshKey, setRefreshKey] = useState(0)

  let body: React.ReactNode = null
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  } else if (!session) {
    body = <LoginScreen />
  } else if (screen === 'settings') {
    body = <SettingsScreen onBack={() => setScreen('library')} />
  } else if (screen === 'detail' && selectedId) {
    body = (
      <DetailScreen
        id={selectedId}
        onBack={() => {
          setScreen('library')
          setRefreshKey((k) => k + 1)
        }}
        onDeleted={() => {
          setSelectedId(null)
          setScreen('library')
          setRefreshKey((k) => k + 1)
        }}
      />
    )
  } else if (screen === 'add') {
    body = (
      <AddScreen
        type={type}
        onTypeChange={setType}
        onArchived={() => setRefreshKey((k) => k + 1)}
      />
    )
  } else {
    body = (
      <LibraryScreen
        type={type}
        refreshKey={refreshKey}
        onSelect={(id) => {
          setSelectedId(id)
          setScreen('detail')
        }}
        onOpenSettings={() => setScreen('settings')}
      />
    )
  }

  // 하단 탭은 라이브러리/검색 화면에서만 보인다 (상세·설정은 뒤로가기로 빠져나온다).
  const showTabs = Boolean(session) && (screen === 'library' || screen === 'add')

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={{ flex: 1, minHeight: 0 }}>{body}</View>
        {showTabs ? (
          <BottomTabs
            screen={screen === 'add' ? 'add' : 'library'}
            type={type}
            onSelectType={(next) => {
              setType(next)
              setScreen('library')
            }}
            onSelectAdd={() => setScreen('add')}
          />
        ) : null}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }
})
