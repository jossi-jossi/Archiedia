import { useState } from 'react'
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import type { ContentType } from '@archiedia/schema'
import { colors, radius } from './src/theme'
import { useSession } from './src/useSession'
import { LoginScreen } from './src/screens/LoginScreen'
import { LibraryScreen } from './src/screens/LibraryScreen'
import { DetailScreen } from './src/screens/DetailScreen'
import { AddScreen } from './src/screens/AddScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { BottomTabs } from './src/components/BottomTabs'

type Screen = 'library' | 'detail' | 'add' | 'settings'

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  )
}

// statusBarTranslucent 모달의 marginTop/marginBottom을 safe area 기준으로 잡으려면
// useSafeAreaInsets가 SafeAreaProvider 하위에서 호출돼야 해서 별도 컴포넌트로 뺐다.
function AppContent(): React.JSX.Element {
  const insets = useSafeAreaInsets()
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

  // 하단 탭은 설정 화면을 제외하고 계속 보인다. 상세는 이제 팝업이라 뒤에 깔린 라이브러리
  // 화면과 탭이 배경으로 비쳐 보이는 게 자연스럽다.
  const showTabs = Boolean(session) && screen !== 'settings'

  return (
    <>
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
      <Modal
        visible={screen === 'detail' && Boolean(selectedId)}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setScreen('library')
          setRefreshKey((k) => k + 1)
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                marginTop: (insets.top + 24) * 1.5,
                marginBottom: (insets.bottom + 24) * 1.5,
                marginHorizontal: 18
              }
            ]}
          >
            {selectedId ? (
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
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // 상세페이지를 화면 전체가 아니라 위아래로 배경이 비치는 떠 있는 카드로 띄워서 팝업처럼 보이게 한다.
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    paddingBottom: 20
  }
})
