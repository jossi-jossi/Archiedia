import { useState } from 'react'
import { Screen, Sidebar } from './components/Sidebar'
import { LoginScreen } from './features/auth/LoginScreen'
import { useSession } from './features/auth/useSession'
import { AddScreen, SearchType } from './features/search/AddScreen'
import { LibraryView as MovieLibraryView } from './features/movies/LibraryView'
import { MovieDetail } from './features/movies/MovieDetail'
import { WatchaImportScreen } from './features/movies/WatchaImportScreen'
import { LibraryView as SeriesLibraryView } from './features/series/LibraryView'
import { SeriesDetail } from './features/series/SeriesDetail'
import { LibraryView as WebtoonLibraryView } from './features/webtoons/LibraryView'
import { WebtoonDetail } from './features/webtoons/WebtoonDetail'
import { LibraryView as BookLibraryView } from './features/books/LibraryView'
import { BookDetail } from './features/books/BookDetail'

// 검색 화면에 들어갈 때 방금 보던 목록의 종류를 기본값으로 잡아준다.
const SEARCH_TYPE_BY_SCREEN: Partial<Record<Screen, SearchType>> = {
  library: 'movie',
  series: 'series',
  webtoon: 'webtoon',
  book: 'book'
}

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
  const [searchType, setSearchType] = useState<SearchType>('movie')

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
        onNavigate={(next) => {
          const type = SEARCH_TYPE_BY_SCREEN[next]
          if (type) setSearchType(type)
          setScreen(next)
        }}
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
        {screen === 'add' && (
          <AddScreen
            type={searchType}
            onTypeChange={setSearchType}
            onArchived={() => setRefreshKey((k) => k + 1)}
          />
        )}
        {screen === 'series' && (
          <SeriesLibraryView
            refreshKey={refreshKey}
            onCountChange={setSeriesCount}
            onSelect={(id) => setSelectedSeriesId(id)}
          />
        )}
        {screen === 'webtoon' && (
          <WebtoonLibraryView
            refreshKey={refreshKey}
            onCountChange={setWebtoonCount}
            onSelect={(id) => setSelectedWebtoonId(id)}
          />
        )}
        {screen === 'book' && (
          <BookLibraryView
            refreshKey={refreshKey}
            onCountChange={setBookCount}
            onSelect={(id) => setSelectedBookId(id)}
          />
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
