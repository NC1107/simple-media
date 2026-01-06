import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import TVShows from './components/TVShows'
import TVShowDetail from './components/TVShowDetail'
import Movies from './components/Movies'
import MovieDetail from './components/MovieDetail'
import Books from './components/Books'
import BookDetail from './components/BookDetail'
import AuthorDetail from './components/AuthorDetail'
import SeriesDetail from './components/SeriesDetail'
import Settings from './components/Settings'
import Search from './components/Search'
import { ToastContainer } from './components/Toast'

// Wrapper components to use useParams
function TVShowDetailWrapper() {
  const { showId } = useParams<{ showId: string }>()
  const navigate = useNavigate()
  return <TVShowDetail showId={decodeURIComponent(showId || '')} onBack={() => navigate('/tv-shows')} />
}

function MovieDetailWrapper() {
  const { movieId } = useParams<{ movieId: string }>()
  const navigate = useNavigate()
  return <MovieDetail movieId={decodeURIComponent(movieId || '')} onBack={() => navigate('/movies')} />
}

function BookDetailWrapper() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Determine where to go back based on where we came from
  const handleBack = () => {
    const referrer = location.state?.from || '/books'
    navigate(referrer)
  }
  
  return <BookDetail bookId={decodeURIComponent(bookId || '')} onBack={handleBack} />
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg z-40 transition-all duration-300 ease-in-out ${menuOpen ? 'w-64' : 'w-16'}`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="absolute -right-3 top-6 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-50"
        >
          <svg
            className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="p-4">
          {/* Logo - only show when expanded */}
          {menuOpen && (
            <div 
              className="mb-6 flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNavigation('/')}
            >
              <img
                src="/logo.jpg"
                alt="Simple Media Logo"
                className="w-10 h-10 rounded-full object-cover"
              />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Simple Media</h2>
            </div>
          )}
          
          {/* Compact logo - only show when collapsed */}
          {!menuOpen && (
            <div 
              className="mb-6 flex justify-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNavigation('/')}
            >
              <img
                src="/logo.jpg"
                alt="Simple Media Logo"
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
          )}

          {/* Menu Items */}
          <nav className="space-y-1">
            <button
              onClick={() => handleNavigation('/books')}
              className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                isActive('/books')
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } ${!menuOpen ? 'justify-center' : ''}`}
              title="Books"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {menuOpen && <span className="ml-3">Books</span>}
            </button>

            <button
              onClick={() => handleNavigation('/tv-shows')}
              className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                isActive('/tv-shows')
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } ${!menuOpen ? 'justify-center' : ''}`}
              title="TV Shows"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {menuOpen && <span className="ml-3">TV Shows</span>}
            </button>
            
            <button
              onClick={() => handleNavigation('/movies')}
              className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                isActive('/movies')
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } ${!menuOpen ? 'justify-center' : ''}`}
              title="Movies"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              {menuOpen && <span className="ml-3">Movies</span>}
            </button>
            
            <button
              onClick={() => handleNavigation('/settings')}
              className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                isActive('/settings')
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } ${!menuOpen ? 'justify-center' : ''}`}
              title="Settings"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {menuOpen && <span className="ml-3">Settings</span>}
            </button>
          </nav>
          
          {/* Dark mode toggle at bottom */}
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-full flex items-center px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${!menuOpen ? 'justify-center' : ''}`}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {menuOpen && <span className="ml-3">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${menuOpen ? 'ml-64' : 'ml-16'}`}
      >
        {/* Search bar - visible on all pages */}
        <div className="sticky top-0 z-30 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-4 px-6">
          <div className="flex justify-center">
            <Search />
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tv-shows" element={<TVShows onShowSelect={(id) => navigate(`/tv-shows/${encodeURIComponent(id)}`)} />} />
          <Route path="/tv-shows/:showId" element={<TVShowDetailWrapper />} />
          <Route path="/movies" element={<Movies onMovieSelect={(id) => navigate(`/movies/${encodeURIComponent(id)}`)} />} />
          <Route path="/movies/:movieId" element={<MovieDetailWrapper />} />

          {/* Books hierarchical routes */}
          <Route path="/books" element={<Books />} />
          <Route path="/books/authors/:authorId" element={<AuthorDetail />} />
          <Route path="/books/series/:seriesId" element={<SeriesDetail />} />
          <Route path="/books/:bookId" element={<BookDetailWrapper />} />

          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      
      <ToastContainer />
    </div>
  )
}

export default App
