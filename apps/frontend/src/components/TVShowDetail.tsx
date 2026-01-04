import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

interface TVShowDetailProps {
  showId: string
  onBack: () => void
}

interface TVShowData {
  id: string
  name: string
  path: string
}

interface Season {
  id: string
  name: string
  seasonNumber: number
  path: string
}

interface Episode {
  id: string
  name: string
  episodeNumber: number
  path: string
  extension: string
}

export default function TVShowDetail({ showId, onBack }: TVShowDetailProps) {
  const [show, setShow] = useState<TVShowData | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [episodes, setEpisodes] = useState<{ [seasonId: string]: Episode[] }>({})
  const [expandedSeasons, setExpandedSeasons] = useState<{ [seasonId: string]: boolean }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShowDetails()
    fetchSeasons()
  }, [showId])

  const fetchShowDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tv-shows`)
      const data = await response.json()
      const foundShow = data.shows.find((s: TVShowData) => s.id === showId)
      setShow(foundShow || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSeasons = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tv-shows/${encodeURIComponent(showId)}/seasons`)
      const data = await response.json()
      setSeasons(data.seasons || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchEpisodes = async (seasonId: string) => {
    if (episodes[seasonId]) return // Already fetched
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tv-shows/${encodeURIComponent(showId)}/seasons/${encodeURIComponent(seasonId)}/episodes`
      )
      const data = await response.json()
      setEpisodes(prev => ({ ...prev, [seasonId]: data.episodes || [] }))
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSeason = (seasonId: string) => {
    const isExpanding = !expandedSeasons[seasonId]
    setExpandedSeasons(prev => ({ ...prev, [seasonId]: isExpanding }))
    
    if (isExpanding) {
      fetchEpisodes(seasonId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!show) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
        >
          ← Back to TV Shows
        </button>
        <p className="text-gray-600 dark:text-gray-400">Show not found</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to TV Shows
      </button>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Poster placeholder */}
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
          
          {/* Metadata section - placeholder for future */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Metadata</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Coming soon...</p>
          </div>
        </div>

        {/* Show details */}
        <div className="md:col-span-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{show.name}</h1>
          
          {/* File information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">File Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Directory Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{show.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">File Path</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">{show.path}</dd>
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
              Detailed show information will appear here once metadata is fetched.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Seasons & Episodes</h2>
            
            {seasons.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No seasons found
              </p>
            )}

            <div className="space-y-2">
              {seasons.map((season) => (
                <div key={season.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSeason(season.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                        <span className="text-white font-bold">{season.seasonNumber}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{season.name}</span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                        expandedSeasons[season.id] ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedSeasons[season.id] && (
                    <div className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {!episodes[season.id] && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          Loading episodes...
                        </div>
                      )}
                      {episodes[season.id]?.length === 0 && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No episodes found
                        </div>
                      )}
                      {episodes[season.id]?.map((episode) => (
                        <div key={episode.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{episode.episodeNumber || '?'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={episode.name}>
                                {episode.name}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                                  {episode.extension.toUpperCase().replace('.', '')}
                                </span>
                              </div>
                            </div>
                            <button className="flex-shrink-0 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
