import { useState, useEffect } from 'react'

interface TVShow {
  id: string
  name: string
  path: string
}

interface TVShowsResponse {
  shows: TVShow[]
  total: number
  message?: string
}

export default function TVShows() {
  const [shows, setShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchShows()
  }, [])

  const fetchShows = async () => {
    try {
      const response = await fetch('http://localhost:8101/api/tv-shows')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading TV shows...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{error}</p>
        </div>
      </div>
    )
  }

  if (shows.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-600">No TV shows found</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        TV Shows ({shows.length})
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {shows.map((show) => (
          <div
            key={show.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer"
          >
            <div className="aspect-[2/3] bg-gray-200 rounded mb-2 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
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
            <h3 className="text-sm font-medium text-gray-900 truncate" title={show.name}>
              {show.name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  )
}
