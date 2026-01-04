import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

interface Stats {
  tvShows: number
  movies: number
  books: number
}

interface DatabaseItem {
  id: number
  type: string
  title: string
  path: string
  file_size?: number
  last_scanned: number
  metadata_json?: string
  metadata?: any
}

interface DatabaseDebug {
  tvShows: DatabaseItem[]
  movies: DatabaseItem[]
  books: DatabaseItem[]
  summary: {
    tvShowsTotal: number
    tvShowsWithMetadata: number
    moviesTotal: number
    moviesWithMetadata: number
    booksTotal: number
    booksWithMetadata: number
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ tvShows: 0, movies: 0, books: 0 })
  const [loading, setLoading] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  const [debugData, setDebugData] = useState<DatabaseDebug | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDebugData = async () => {
    setDebugLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/debug/database`)
      const data = await response.json()
      setDebugData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setDebugLoading(false)
    }
  }

  const toggleDebug = () => {
    const newShowDebug = !showDebug
    setShowDebug(newShowDebug)
    if (newShowDebug && !debugData) {
      fetchDebugData()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading stats...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TV Shows Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">TV Shows</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.tvShows}</p>
            </div>
            <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Movies Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Movies</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.movies}</p>
            </div>
            <svg className="w-12 h-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        </div>

        {/* Books Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Books</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.books}</p>
            </div>
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Library Overview</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Total items in library: <span className="font-semibold text-gray-900 dark:text-white">{stats.tvShows + stats.movies + stats.books}</span>
        </p>
      </div>

      {/* Database Inspector */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Database Inspector</h2>
          <button
            onClick={toggleDebug}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {showDebug ? 'Hide' : 'Show'} Database Contents
          </button>
        </div>

        {showDebug && (
          <div className="mt-4">
            {debugLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading database data...</p>
            ) : debugData ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Movies with Metadata</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {debugData.summary.moviesWithMetadata}/{debugData.summary.moviesTotal}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">TV Shows with Metadata</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {debugData.summary.tvShowsWithMetadata}/{debugData.summary.tvShowsTotal}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Books with Metadata</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {debugData.summary.booksWithMetadata}/{debugData.summary.booksTotal}
                    </p>
                  </div>
                </div>

                {/* Movies Detail */}
                {debugData.movies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Movies</h3>
                    <div className="space-y-3">
                      {debugData.movies.map((movie) => (
                        <div key={movie.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white">{movie.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">ID: {movie.id} | Path: {movie.path}</p>
                              {movie.file_size && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Size: {(movie.file_size / 1024 / 1024 / 1024).toFixed(2)} GB
                                </p>
                              )}
                            </div>
                            <div className="ml-4">
                              {movie.metadata ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-xs font-semibold">
                                  Has Metadata
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs font-semibold">
                                  No Metadata
                                </span>
                              )}
                            </div>
                          </div>
                          {movie.metadata && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                              <p className="font-semibold mb-1 text-gray-900 dark:text-white">TMDB Data:</p>
                              <p className="text-gray-700 dark:text-gray-300">Title: {movie.metadata.title}</p>
                              <p className="text-gray-700 dark:text-gray-300">Year: {movie.metadata.release_year}</p>
                              <p className="text-gray-700 dark:text-gray-300">Rating: {movie.metadata.rating}/10</p>
                              {movie.metadata.poster_url && (
                                <p className="text-gray-700 dark:text-gray-300">Poster: ✓</p>
                              )}
                              {movie.metadata.overview && (
                                <p className="text-gray-700 dark:text-gray-300 mt-2">
                                  Overview: {movie.metadata.overview.substring(0, 150)}...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TV Shows Detail */}
                {debugData.tvShows.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">TV Shows</h3>
                    <div className="space-y-3">
                      {debugData.tvShows.map((show) => (
                        <div key={show.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded">
                          <p className="font-semibold text-gray-900 dark:text-white">{show.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">ID: {show.id} | Path: {show.path}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Click "Show Database Contents" to inspect the database.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
