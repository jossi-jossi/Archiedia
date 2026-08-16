import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native'
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

  // 상세/설정 모두 이제 팝업이라 뒤에 깔린 라이브러리 화면과 하단 탭이 배경으로 계속
  // 비쳐 보이는 게 자연스럽다.
  const showTabs = Boolean(session)

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
      <PopupModal
        visible={screen === 'detail' && Boolean(selectedId)}
        onClose={() => {
          setScreen('library')
          setRefreshKey((k) => k + 1)
        }}
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
      </PopupModal>
      <PopupModal visible={screen === 'settings'} onClose={() => setScreen('library')} fitContent>
        <SettingsScreen onClose={() => setScreen('library')} />
      </PopupModal>
    </>
  )
}

// 상세/설정 페이지가 공통으로 쓰는 팝업 카드 셸. 배경(탭하면 닫힘)과 카드를 형제로 분리해서
// 카드 쪽 터치 트리에 Pressable이 끼지 않게 한다 — 감싸면 안에 있는 ScrollView와 터치
// responder 협상이 꼬여서 스크롤 제스처가 가끔 씹히는 문제가 있었다.
function PopupModal({
  visible,
  onClose,
  children,
  fitContent = false
}: {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  // 설정처럼 내용이 짧은 팝업은 상세페이지 팝업과 같은 큰 고정 높이를 채우면 아래쪽에
  // 빈 공간만 남는다. true면 카드가 내용 높이만큼만 커지고 세로 중앙에 놓인다.
  fitContent?: boolean
}): React.JSX.Element {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View
          pointerEvents="box-none"
          style={{
            flex: 1,
            marginTop: (insets.top + 24) * 1.5,
            marginBottom: (insets.bottom + 24) * 1.5,
            marginHorizontal: 18,
            justifyContent: fitContent ? 'center' : undefined
          }}
        >
          <View style={[styles.modalCard, fitContent && { flex: undefined, maxHeight: '100%' }]}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // 상세/설정 페이지를 화면 전체가 아니라 위아래로 배경이 비치는 떠 있는 카드로 띄워서
  // 팝업처럼 보이게 한다.
  // 카드와 형제로 분리된, 탭하면 닫히는 전체 화면 딤 레이어라 absoluteFill로 겹쳐 깐다.
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    paddingBottom: 20
  }
})
