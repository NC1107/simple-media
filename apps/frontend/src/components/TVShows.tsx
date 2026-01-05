import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'
import { showToast } from './Toast'
import { resolveImageUrl } from '../utils/imageUrl'

interface TVShow {
  id: string
  name: string
  path: string
  posterUrl?: string | null
  metadata?: TVShowMetadata | null
}

interface TVShowMetadata {
  tvdb_id: string
  title: string
  overview: string | null
  first_air_year: string | null
  poster_url: string | null
  backdrop_url: string | null
  status: string | null
  genres: string[]
  runtime: number | null
  network: string | null
  original_language: string | null
  num_seasons: number | null
  rating: number | null
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
  const [justScanned, setJustScanned] = useState<Set<string>>(new Set())

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
    setJustScanned(new Set())
    
    // Connect to SSE endpoint for progress updates
    const eventSource = new EventSource(`${API_BASE_URL}/api/scan/progress`)
    
    eventSource.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'scanned' && data.category === 'tv') {
        // Refresh the shows list to get updated data
        const response = await fetch(`${API_BASE_URL}/api/tv-shows`)
        const showsData: TVShowsResponse = await response.json()
        setShows(showsData.shows || [])
        
        // Find the show that was just scanned and mark it
        const scannedShow = (showsData.shows || []).find(s => s.name === data.item || data.item.includes(s.name))
        if (scannedShow) {
          setJustScanned(prev => new Set([...prev, scannedShow.id]))
          // Remove the indicator after 2 seconds
          setTimeout(() => {
            setJustScanned(prev => {
              const next = new Set(prev)
              next.delete(scannedShow.id)
              return next
            })
          }, 2000)
        }
      } else if (data.type === 'complete') {
        eventSource.close()
      }
    }
    
    eventSource.onerror = () => {
      eventSource.close()
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/scan/tv`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const result = await response.json()
      showToast(`TV Shows scan completed! Added: ${result.added}, Updated: ${result.updated}`, 'success')
      
      // Final refresh
      await fetchShows()
    } catch (error) {
      console.error('TV Shows scan failed:', error)
      showToast('Failed to scan TV shows. Check console for details.', 'error')
    } finally {
      setScanning(false)
      eventSource.close()
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
          const posterUrl = show.posterUrl || show.metadata?.poster_url || null
          const isJustScanned = justScanned.has(show.id)
          
          return (
            <div
              key={show.id}
              onClick={() => onShowSelect(show.id)}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all p-4 cursor-pointer ${
                isJustScanned ? 'ring-4 ring-green-500 ring-opacity-50' : ''
              }`}
            >
              <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded mb-2 overflow-hidden flex items-center justify-center relative">
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
