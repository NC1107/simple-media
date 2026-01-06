import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

interface MovieDetailProps {
  movieId: string
  onBack: () => void
}

interface MovieData {
  id: string
  name: string
  path: string
  metadata?: MovieMetadata | null
}

interface MovieMetadata {
  tmdb_id: number
  title: string
  overview: string
  release_year: string
  poster_url: string | null
  backdrop_url: string | null
  rating: number
  vote_count: number
  genres: string[]
  runtime: number | null
  tagline: string
  status: string
  original_language: string
}

export default function MovieDetail({ movieId, onBack }: MovieDetailProps) {
  const [movie, setMovie] = useState<MovieData | null>(null)
  const [metadata, setMetadata] = useState<MovieMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  useEffect(() => {
    fetchMovieDetails()
  }, [movieId])

  const fetchMovieDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/movies`)
      const data = await response.json()
      const foundMovie = data.movies.find((m: MovieData) => m.id === movieId)
      setMovie(foundMovie || null)
      if (foundMovie?.metadata) {
        setMetadata(foundMovie.metadata)
      }
    } catch (err) {
      console.error('Failed to fetch movie details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchMetadata = async () => {
    if (!movie) return
    
    setFetchingMetadata(true)
    setMetadataError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/movies/${encodeURIComponent(movieId)}/metadata`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        setMetadataError(error.error || 'Failed to fetch metadata')
        return
      }
      
      const data = await response.json()
      setMetadata(data.metadata)
    } catch (err) {
      console.error('Error fetching metadata:', err)
      setMetadataError('Failed to connect to server')
    } finally {
      setFetchingMetadata(false)
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
          <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
            {metadata?.poster_url ? (
              <img 
                src={metadata.poster_url} 
                alt={metadata.title}
                className="w-full h-full object-cover"
              />
            ) : (
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
            )}
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Metadata</h3>
            {metadata ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">TMDB ID:</span>
                  <a 
                    href={`https://www.themoviedb.org/movie/${metadata.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {metadata.tmdb_id}
                  </a>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Rating:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{metadata.rating.toFixed(1)}/10</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Votes:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{metadata.vote_count.toLocaleString()}</span>
                </div>
                {metadata.runtime && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Runtime:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{metadata.runtime} min</span>
                  </div>
                )}
                {metadata.genres && metadata.genres.length > 0 && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Genres:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{metadata.genres.join(', ')}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{metadata.status}</span>
                </div>
              </div>
            ) : (
              <div>
                {metadataError ? (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3">{metadataError}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">No metadata available</p>
                )}
                <button
                  onClick={handleFetchMetadata}
                  disabled={fetchingMetadata}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {fetchingMetadata ? 'Fetching...' : 'Fetch Metadata'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {metadata?.title || movie.name}
          </h1>
          
          {metadata?.release_year && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              {metadata.release_year}
            </p>
          )}
          
          {metadata?.tagline && (
            <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-6">
              "{metadata.tagline}"
            </p>
          )}
          
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
            {metadata?.overview ? (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {metadata.overview}
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Detailed movie information will appear here once metadata is fetched.
              </p>
            )}
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
