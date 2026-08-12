import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { LoginScreen } from './features/auth/LoginScreen'
import { useSession } from './features/auth/useSession'
import { AddMovieForm } from './features/movies/AddMovieForm'
import { LibraryView } from './features/movies/LibraryView'
import { MovieDetail } from './features/movies/MovieDetail'

type Screen = 'library' | 'add' | 'detail'

function App(): React.JSX.Element {
  const { session, loading } = useSession()
  const [screen, setScreen] = useState<Screen>('library')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [movieCount, setMovieCount] = useState(0)

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        불러오는 중...
      </div>
    )
  }

  if (!session) return <LoginScreen />

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <Sidebar screen={screen} movieCount={movieCount} onNavigate={(next) => setScreen(next)} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {screen === 'library' && (
          <LibraryView
            refreshKey={refreshKey}
            onAdd={() => setScreen('add')}
            onCountChange={setMovieCount}
            onSelect={(id) => {
              setSelectedId(id)
              setScreen('detail')
            }}
          />
        )}
        {screen === 'add' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 32px 40px' }}>
            <h2 style={{ margin: '0 0 16px' }}>검색 · 추가</h2>
            <AddMovieForm
              onCreated={(id) => {
                setSelectedId(id)
                setRefreshKey((k) => k + 1)
                setScreen('detail')
              }}
            />
          </div>
        )}
        {screen === 'detail' && selectedId && (
          <MovieDetail movieId={selectedId} onBack={() => setScreen('library')} />
        )}
      </div>
    </div>
  )
}

export default App
