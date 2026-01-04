import { useState, useEffect } from 'react'

interface MovieDetailProps {
  movieId: string
  onBack: () => void
}

interface MovieData {
  id: string
  name: string
  path: string
}

export default function MovieDetail({ movieId, onBack }: MovieDetailProps) {
  const [movie, setMovie] = useState<MovieData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMovieDetails()
  }, [movieId])

  const fetchMovieDetails = async () => {
    try {
      const response = await fetch('http://localhost:8101/api/movies')
      const data = await response.json()
      const foundMovie = data.movies.find((m: MovieData) => m.id === movieId)
      setMovie(foundMovie || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
        >
          ← Back to Movies
        </button>
        <p className="text-gray-600 dark:text-gray-400">Movie not found</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Movies
      </button>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-lg">
            <svg
              className="w-24 h-24 text-gray-400 dark:text-gray-500"
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
          
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Metadata</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Coming soon...</p>
          </div>
        </div>

        <div className="md:col-span-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{movie.name}</h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">File Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Directory Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{movie.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">File Path</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">{movie.path}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    Available
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Description</h2>
            <p className="text-gray-500 dark:text-gray-400 italic">
              Detailed movie information will appear here once metadata is fetched.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">File Details</h2>
            <p className="text-gray-500 dark:text-gray-400 italic">
              Video file details will be populated from file system scan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
