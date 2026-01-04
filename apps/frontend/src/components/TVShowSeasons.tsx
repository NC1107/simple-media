import { useState, useEffect } from 'react'

interface Season {
  id: string
  name: string
  seasonNumber: number
  path: string
}

interface SeasonsResponse {
  seasons: Season[]
  total: number
  message?: string
}

interface TVShowSeasonsProps {
  showId: string
  showName: string
  onSeasonSelect: (seasonId: string) => void
  onBack: () => void
}

export default function TVShowSeasons({ showId, showName, onSeasonSelect, onBack }: TVShowSeasonsProps) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSeasons()
  }, [showId])

  const fetchSeasons = async () => {
    try {
      const response = await fetch(`http://localhost:8101/api/tv-shows/${encodeURIComponent(showId)}/seasons`)
      const data: SeasonsResponse = await response.json()
      
      if (data.message) {
        setError(data.message)
      }
      
      setSeasons(data.seasons || [])
    } catch (err) {
      setError('Failed to load seasons')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading seasons...</p>
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
        Back to TV Shows
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{showName}</h1>
        <p className="text-gray-600 dark:text-gray-400">Select a season to view episodes</p>
      </div>

      {error && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">{error}</p>
        </div>
      )}

      {seasons.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No seasons found</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {seasons.map((season) => (
          <div
            key={season.id}
            onClick={() => onSeasonSelect(season.id)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer"
          >
            <div className="aspect-square bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-white text-4xl font-bold">{season.seasonNumber}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white text-center truncate" title={season.name}>
              {season.name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  )
}
