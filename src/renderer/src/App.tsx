import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { LoginScreen } from './features/auth/LoginScreen'
import { useSession } from './features/auth/useSession'
import { AddMovieScreen } from './features/movies/AddMovieScreen'
import { LibraryView } from './features/movies/LibraryView'
import { MovieDetail } from './features/movies/MovieDetail'

type Screen = 'library' | 'add'

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
            onCountChange={setMovieCount}
            onSelect={(id) => setSelectedId(id)}
          />
        )}
        {screen === 'add' && (
          <AddMovieScreen
            onCreated={(id) => {
              setSelectedId(id)
              setRefreshKey((k) => k + 1)
              setScreen('library')
            }}
          />
        )}
      </div>
      {selectedId && <MovieDetail movieId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

export default App
