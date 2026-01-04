import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'
import { showToast } from './Toast'

// Helper function to resolve image URLs (local vs remote)
function resolveImageUrl(imagePath: string | null, showPath: string): string | undefined {
  if (!imagePath) return undefined
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // It's a local path, construct API URL
  return `${API_BASE_URL}/api/images/tv/${encodeURIComponent(showPath)}/${imagePath}`
}

interface TVShow {
  id: string
  name: string
  path: string
  metadata_json?: string
}

interface TVShowMetadata {
  poster_url: string | null
}

interface TVShowsResponse {
  shows: TVShow[]
  total: number
  message?: string
}

interface TVShowsProps {
  onShowSelect: (showId: string) => void
}

export default function TVShows({ onShowSelect }: TVShowsProps) {
  const [shows, setShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    fetchShows()
  }, [])

  const fetchShows = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tv-shows`)
      const data: TVShowsResponse = await response.json()
      
      if (data.message) {
        setError(data.message)
      }
      
      setShows(data.shows || [])
    } catch (err) {
      setError('Failed to load TV shows')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/scan/tv`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const result = await response.json()
      showToast(`TV Shows scan completed! Added: ${result.added}, Updated: ${result.updated}`, 'success')
      
      // Refresh the shows list
      await fetchShows()
    } catch (error) {
      console.error('TV Shows scan failed:', error)
      showToast('Failed to scan TV shows. Check console for details.', 'error')
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading TV shows...</p>
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

  if (shows.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">No TV shows found</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          TV Shows ({shows.length})
        </h2>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? 'Scanning...' : 'Scan TV Shows'}
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {shows.map((show) => {
          let posterUrl: string | null = null
          if (show.metadata_json) {
            try {
              const metadata: TVShowMetadata = JSON.parse(show.metadata_json)
              posterUrl = metadata.poster_url
            } catch (e) {
              console.error('Failed to parse metadata:', e)
            }
          }
          
          return (
            <div
              key={show.id}
              onClick={() => onShowSelect(show.id)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer"
            >
              <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded mb-2 overflow-hidden flex items-center justify-center">
                {posterUrl ? (
                  <img src={resolveImageUrl(posterUrl, show.path)} alt={show.name} className="w-full h-full object-cover" />
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
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={show.name}>
                {show.name}
              </h3>
            </div>
          )
        })}
      </div>
    </div>
  )
}
