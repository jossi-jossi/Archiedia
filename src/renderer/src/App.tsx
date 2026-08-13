import { useState } from 'react'
import { Screen, Sidebar } from './components/Sidebar'
import { LoginScreen } from './features/auth/LoginScreen'
import { useSession } from './features/auth/useSession'
import { AddMovieScreen } from './features/movies/AddMovieScreen'
import { LibraryView as MovieLibraryView } from './features/movies/LibraryView'
import { MovieDetail } from './features/movies/MovieDetail'
import { WatchaImportScreen } from './features/movies/WatchaImportScreen'
import { AddSeriesScreen } from './features/series/AddSeriesScreen'
import { LibraryView as SeriesLibraryView } from './features/series/LibraryView'
import { SeriesDetail } from './features/series/SeriesDetail'

function App(): React.JSX.Element {
  const { session, loading } = useSession()
  const [screen, setScreen] = useState<Screen>('library')
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [movieCount, setMovieCount] = useState(0)
  const [seriesCount, setSeriesCount] = useState(0)

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
      <Sidebar
        screen={screen}
        movieCount={movieCount}
        seriesCount={seriesCount}
        onNavigate={(next) => setScreen(next)}
      />
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
          <MovieLibraryView
            refreshKey={refreshKey}
            onCountChange={setMovieCount}
            onSelect={(id) => setSelectedMovieId(id)}
          />
        )}
        {screen === 'add' && <AddMovieScreen onArchived={() => setRefreshKey((k) => k + 1)} />}
        {screen === 'series' && (
          <SeriesLibraryView
            refreshKey={refreshKey}
            onCountChange={setSeriesCount}
            onSelect={(id) => setSelectedSeriesId(id)}
          />
        )}
        {screen === 'series-add' && (
          <AddSeriesScreen onArchived={() => setRefreshKey((k) => k + 1)} />
        )}
        {screen === 'import' && (
          <WatchaImportScreen onImported={() => setRefreshKey((k) => k + 1)} />
        )}
      </div>
      {selectedMovieId && (
        <MovieDetail
          movieId={selectedMovieId}
          onClose={() => {
            setSelectedMovieId(null)
            setRefreshKey((k) => k + 1)
          }}
          onDeleted={() => {
            setSelectedMovieId(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
      {selectedSeriesId && (
        <SeriesDetail
          seriesId={selectedSeriesId}
          onClose={() => {
            setSelectedSeriesId(null)
            setRefreshKey((k) => k + 1)
          }}
          onDeleted={() => {
            setSelectedSeriesId(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}

export default App
