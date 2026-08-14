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
import { AddWebtoonScreen } from './features/webtoons/AddWebtoonScreen'
import { LibraryView as WebtoonLibraryView } from './features/webtoons/LibraryView'
import { WebtoonDetail } from './features/webtoons/WebtoonDetail'
import { AddBookScreen } from './features/books/AddBookScreen'
import { LibraryView as BookLibraryView } from './features/books/LibraryView'
import { BookDetail } from './features/books/BookDetail'

function App(): React.JSX.Element {
  const { session, loading } = useSession()
  const [screen, setScreen] = useState<Screen>('library')
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [selectedWebtoonId, setSelectedWebtoonId] = useState<string | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [movieCount, setMovieCount] = useState(0)
  const [seriesCount, setSeriesCount] = useState(0)
  const [webtoonCount, setWebtoonCount] = useState(0)
  const [bookCount, setBookCount] = useState(0)

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
        webtoonCount={webtoonCount}
        bookCount={bookCount}
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
        {screen === 'webtoon' && (
          <WebtoonLibraryView
            refreshKey={refreshKey}
            onCountChange={setWebtoonCount}
            onSelect={(id) => setSelectedWebtoonId(id)}
          />
        )}
        {screen === 'webtoon-add' && (
          <AddWebtoonScreen onArchived={() => setRefreshKey((k) => k + 1)} />
        )}
        {screen === 'book' && (
          <BookLibraryView
            refreshKey={refreshKey}
            onCountChange={setBookCount}
            onSelect={(id) => setSelectedBookId(id)}
          />
        )}
        {screen === 'book-add' && <AddBookScreen onArchived={() => setRefreshKey((k) => k + 1)} />}
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
      {selectedWebtoonId && (
        <WebtoonDetail
          webtoonId={selectedWebtoonId}
          onClose={() => {
            setSelectedWebtoonId(null)
            setRefreshKey((k) => k + 1)
          }}
          onDeleted={() => {
            setSelectedWebtoonId(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
      {selectedBookId && (
        <BookDetail
          bookId={selectedBookId}
          onClose={() => {
            setSelectedBookId(null)
            setRefreshKey((k) => k + 1)
          }}
          onDeleted={() => {
            setSelectedBookId(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}

export default App
