import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'
import { showToast } from './Toast'

interface Movie {
  id: string
  name: string
  path: string
  metadata?: {
    poster_url: string | null
    title?: string
  } | null
}

interface MoviesResponse {
  movies: Movie[]
  total: number
  message?: string
}

interface MoviesProps {
  onMovieSelect: (movieId: string) => void
}

export default function Movies({ onMovieSelect }: MoviesProps) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/movies`)
      const data: MoviesResponse = await response.json()
      
      if (data.message) {
        setError(data.message)
      }
      
      setMovies(data.movies || [])
    } catch (err) {
      setError('Failed to load movies')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/scan/movies`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const result = await response.json()
      showToast(`Movies scan completed! Added: ${result.added}, Updated: ${result.updated}`, 'success')
      
      // Refresh the movies list
      await fetchMovies()
    } catch (error) {
      console.error('Movies scan failed:', error)
      showToast('Failed to scan movies. Check console for details.', 'error')
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading movies...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">{error}</p>
        </div>
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">No movies found</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Movies ({movies.length})
        </h2>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? 'Scanning...' : 'Scan Movies'}
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {movies.map((movie) => (
          <div
            key={movie.id}
            onClick={() => onMovieSelect(movie.id)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
          >
            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {movie.metadata?.poster_url ? (
                <img 
                  src={movie.metadata.poster_url} 
                  alt={movie.metadata.title || movie.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={movie.name}>
                {movie.name}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
