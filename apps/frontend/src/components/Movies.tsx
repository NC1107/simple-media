import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

interface Movie {
  id: string
  name: string
  path: string
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Movies ({movies.length})
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {movies.map((movie) => (
          <div
            key={movie.id}
            onClick={() => onMovieSelect(movie.id)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer"
          >
            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
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
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={movie.name}>
              {movie.name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  )
}
