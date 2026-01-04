import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'
import { showToast } from './Toast'

// Helper function to resolve image URLs (local vs remote)
function resolveImageUrl(imagePath: string | null, showPath: string, seasonNumber?: number): string | null {
  if (!imagePath) return null
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // It's a local path, construct API URL
  if (seasonNumber !== undefined) {
    // Episode thumbnail
    return `${API_BASE_URL}/api/images/tv/${encodeURIComponent(showPath)}/Season ${seasonNumber}/${imagePath}`
  } else {
    // Show poster
    return `${API_BASE_URL}/api/images/tv/${encodeURIComponent(showPath)}/${imagePath}`
  }
}

interface TVShowDetailProps {
  showId: string
  onBack: () => void
}

interface TVShowData {
  id: string
  name: string
  path: string
  metadata_json?: string
}

interface TVShowMetadata {
  tvdb_id: string
  title: string
  overview: string
  first_air_year: string
  poster_url: string | null
  status: string
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
  fileSize?: number
  metadata_json?: string
}

interface EpisodeMetadata {
  tvdb_id: string
  name: string
  overview: string
  aired: string
  still_url: string | null
  season_number: number
  episode_number: number
}

export default function TVShowDetail({ showId, onBack }: TVShowDetailProps) {
  const [show, setShow] = useState<TVShowData | null>(null)
  const [metadata, setMetadata] = useState<TVShowMetadata | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [episodes, setEpisodes] = useState<{ [seasonId: string]: Episode[] }>({})
  const [expandedSeasons, setExpandedSeasons] = useState<{ [seasonId: string]: boolean }>({})
  const [loading, setLoading] = useState(true)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [episodeMetadata, setEpisodeMetadata] = useState<EpisodeMetadata | null>(null)
  const [fetchingEpisodeMetadata, setFetchingEpisodeMetadata] = useState(false)

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
      
      // Parse metadata if available
      if (foundShow?.metadata_json) {
        try {
          setMetadata(JSON.parse(foundShow.metadata_json))
        } catch (e) {
          console.error('Failed to parse metadata:', e)
        }
      }
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

  const handleFetchMetadata = async () => {
    if (!show) return
    
    setFetchingMetadata(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/tv-shows/${encodeURIComponent(show.path)}/metadata`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch metadata')
      }

      const result = await response.json()
      setMetadata(result.metadata)
      
      // Update show state with new metadata_json
      setShow(prev => prev ? { ...prev, metadata_json: JSON.stringify(result.metadata) } : null)
      
      showToast(`Metadata fetched for ${result.metadata.title}`, 'success')
    } catch (error) {
      console.error('Failed to fetch metadata:', error)
      showToast(`Failed to fetch metadata for ${show.name}`, 'error')
    } finally {
      setFetchingMetadata(false)
    }
  }

  const handleEpisodeClick = (episode: Episode, seasonNumber: number) => {
    setSelectedEpisode(episode)
    
    // Parse existing metadata if available
    if (episode.metadata_json) {
      try {
        setEpisodeMetadata(JSON.parse(episode.metadata_json))
      } catch (e) {
        console.error('Failed to parse episode metadata:', e)
        setEpisodeMetadata(null)
      }
    } else {
      setEpisodeMetadata(null)
    }
  }

  const handleFetchEpisodeMetadata = async () => {
    if (!show || !selectedEpisode) return
    
    setFetchingEpisodeMetadata(true)
    try {
      const seasonNumber = Object.entries(episodes).find(([_, eps]) => 
        eps.some(ep => ep.id === selectedEpisode.id)
      )?.[0].match(/(\d+)/)?.[1] || '1'
      
      const response = await fetch(
        `${API_BASE_URL}/api/tv-shows/${encodeURIComponent(show.path)}/seasons/${seasonNumber}/episodes/${selectedEpisode.episodeNumber}/metadata`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch episode metadata')
      }

      const result = await response.json()
      setEpisodeMetadata(result.metadata)
      showToast(`Metadata fetched for episode ${result.metadata.episode_number}`, 'success')
      
      // Update the episode in the episodes state with new metadata
      const seasonId = `Season ${seasonNumber}`
      setEpisodes(prev => {
        const seasonEpisodes = prev[seasonId] || []
        const updatedEpisodes = seasonEpisodes.map(ep => 
          ep.id === selectedEpisode.id 
            ? { ...ep, metadata_json: JSON.stringify(result.metadata) }
            : ep
        )
        return { ...prev, [seasonId]: updatedEpisodes }
      })
      
      // Update the selected episode to reflect new metadata
      setSelectedEpisode(prev => prev ? { ...prev, metadata_json: JSON.stringify(result.metadata) } : null)
    } catch (error) {
      console.error('Failed to fetch episode metadata:', error)
      showToast('Failed to fetch episode metadata', 'error')
    } finally {
      setFetchingEpisodeMetadata(false)
    }
  }

  const closeEpisodeModal = () => {
    setSelectedEpisode(null)
    setEpisodeMetadata(null)
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
          <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
            {metadata?.poster_url ? (
              <img src={resolveImageUrl(metadata.poster_url, show?.path || '', undefined)} alt={metadata.title} className="w-full h-full object-cover" />
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
          
          {/* Metadata section */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Metadata</h3>
              <button
                onClick={handleFetchMetadata}
                disabled={fetchingMetadata}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {fetchingMetadata ? 'Fetching...' : metadata ? 'Refresh' : 'Fetch'}
              </button>
            </div>
            {metadata ? (
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="font-medium text-gray-600 dark:text-gray-400">Status</dt>
                  <dd className="text-gray-900 dark:text-white">{metadata.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600 dark:text-gray-400">First Aired</dt>
                  <dd className="text-gray-900 dark:text-white">{metadata.first_air_year}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600 dark:text-gray-400">TVDB ID</dt>
                  <dd className="text-gray-900 dark:text-white">{metadata.tvdb_id}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No metadata available</p>
            )}
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
            {metadata?.overview ? (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {metadata.overview}
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Detailed show information will appear here once metadata is fetched.
              </p>
            )}
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
                      {episodes[season.id]?.map((episode) => {
                        // Parse episode metadata for thumbnail
                        let episodeThumb: string | null = null
                        if (episode.metadata_json) {
                          try {
                            const epMeta = JSON.parse(episode.metadata_json)
                            episodeThumb = epMeta.still_url
                          } catch (e) {
                            // Ignore parse errors
                          }
                        }

                        return (
                          <div 
                            key={episode.id} 
                            onClick={() => handleEpisodeClick(episode, season.seasonNumber)}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              {episodeThumb ? (
                                <img 
                                  src={resolveImageUrl(episodeThumb, show?.path || '', season.seasonNumber)} 
                                  alt={`Episode ${episode.episodeNumber}`}
                                  className="flex-shrink-0 w-24 h-14 object-cover rounded"
                                />
                              ) : (
                                <div className="flex-shrink-0 w-24 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{episode.episodeNumber || '?'}</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={episode.name}>
                                  {episode.name}
                                </p>
                                {episode.fileSize && (
                                  <div className="flex gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                                      {(episode.fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                                    </span>
                                  </div>
                                )}
                              </div>
                              <button className="flex-shrink-0 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Episode Detail Modal */}
      {selectedEpisode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={closeEpisodeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Episode Details</h2>
                <button
                  onClick={closeEpisodeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Episode Still/Thumbnail */}
                <div className="md:col-span-1">
                  <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {episodeMetadata?.still_url ? (
                      <img src={resolveImageUrl(episodeMetadata.still_url, show?.path || '', episodeMetadata.season_number)} alt={episodeMetadata.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleFetchEpisodeMetadata}
                      disabled={fetchingEpisodeMetadata}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {fetchingEpisodeMetadata ? 'Fetching...' : episodeMetadata ? 'Refresh Metadata' : 'Fetch Metadata'}
                    </button>
                  </div>
                </div>

                {/* Episode Info */}
                <div className="md:col-span-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {episodeMetadata?.name || selectedEpisode.name}
                  </h3>
                  
                  <div className="flex gap-2 mb-4">
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      Episode {selectedEpisode.episodeNumber || '?'}
                    </span>
                    {episodeMetadata?.aired && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        Aired: {new Date(episodeMetadata.aired).toLocaleDateString()}
                      </span>
                    )}
                    {selectedEpisode.fileSize && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {(selectedEpisode.fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                      </span>
                    )}
                  </div>

                  {episodeMetadata?.overview ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Overview</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {episodeMetadata.overview}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-4">
                      No episode description available. Fetch metadata to load details from TVDB.
                    </p>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">File Information</h4>
                    <dl className="space-y-2 text-xs">
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">File Name</dt>
                        <dd className="text-gray-900 dark:text-white font-mono mt-1 break-all">{selectedEpisode.name}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">File Path</dt>
                        <dd className="text-gray-900 dark:text-white font-mono mt-1 break-all">{selectedEpisode.path}</dd>
                      </div>
                      {episodeMetadata?.tvdb_id && (
                        <div>
                          <dt className="font-medium text-gray-500 dark:text-gray-400">TVDB ID</dt>
                          <dd className="text-gray-900 dark:text-white mt-1">{episodeMetadata.tvdb_id}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
