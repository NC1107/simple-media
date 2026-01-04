import { useState } from 'react'
import TVShows from './components/TVShows'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentView, setCurrentView] = useState('welcome')

  const handleNavigation = (view: string) => {
    setCurrentView(view)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hamburger Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {menuOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          {/* Logo */}
          <div className="mb-6 flex items-center space-x-2">
            <img
              src="/logo.jpg"
              alt="Simple Media Logo"
              className="w-12 h-12 rounded-full object-cover"
            />
            <h2 className="text-xl font-bold text-gray-900">Simple Media</h2>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); handleNavigation('books') }}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Books
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); handleNavigation('tv-shows') }}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              TV Shows
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); handleNavigation('movies') }}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Movies
            </a>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen">
        {currentView === 'welcome' && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Simple Media
              </h1>
              <p className="text-xl text-gray-600">
                Click the menu to get started
              </p>
            </div>
          </div>
        )}
        
        {currentView === 'tv-shows' && <TVShows />}
        
        {currentView === 'books' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900">Books</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )}
        
        {currentView === 'movies' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900">Movies</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App