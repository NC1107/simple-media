import { useState, useEffect } from 'react'

interface Episode {
  id: string
  name: string
  episodeNumber: number
  path: string
  extension: string
}

interface EpisodesResponse {
  episodes: Episode[]
  total: number
  message?: string
}

interface SeasonEpisodesProps {
  showId: string
  showName: string
  seasonId: string
  onBack: () => void
}

export default function SeasonEpisodes({ showId, showName, seasonId, onBack }: SeasonEpisodesProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEpisodes()
  }, [showId, seasonId])

  const fetchEpisodes = async () => {
    try {
      const response = await fetch(
        `http://localhost:8101/api/tv-shows/${encodeURIComponent(showId)}/seasons/${encodeURIComponent(seasonId)}/episodes`
      )
      const data: EpisodesResponse = await response.json()
      
      if (data.message) {
        setError(data.message)
      }
      
      setEpisodes(data.episodes || [])
    } catch (err) {
      setError('Failed to load episodes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading episodes...</p>
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
        Back to Seasons
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{showName}</h1>
        <h2 className="text-xl text-gray-600 dark:text-gray-400">{seasonId}</h2>
      </div>

      {error && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">{error}</p>
        </div>
      )}

      {episodes.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No episodes found</p>
        </div>
      )}

      <div className="space-y-3">
        {episodes.map((episode) => (
          <div
            key={episode.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4"
          >
            <div className="flex items-start gap-4">
              {/* Episode Number Badge */}
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">{episode.episodeNumber || '?'}</span>
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 truncate" title={episode.name}>
                  {episode.name}
                </h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    {episode.extension.toUpperCase().replace('.', '')}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    Episode {episode.episodeNumber}
                  </span>
                </div>
              </div>

              {/* Play Button Placeholder */}
              <div className="flex-shrink-0">
                <button className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
