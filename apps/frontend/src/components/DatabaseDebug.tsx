import { useEffect, useState } from 'react'

interface MediaItem {
  id: number
  type: string
  title: string
  path: string
  file_size: number | null
  last_scanned: number
  metadata_json: string | null
  metadata: any
}

interface DatabaseData {
  tvShows: MediaItem[]
  movies: MediaItem[]
  books: MediaItem[]
  summary: {
    tvShowsTotal: number
    tvShowsWithMetadata: number
    moviesTotal: number
    moviesWithMetadata: number
    booksTotal: number
    booksWithMetadata: number
  }
}

export default function DatabaseDebug() {
  const [data, setData] = useState<DatabaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/debug/database')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch database data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading database info...</div>
  }

  if (!data) {
    return <div className="text-red-400">Failed to load database data</div>
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const gb = (bytes / (1024 ** 3)).toFixed(2)
    return `${gb} GB`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const renderMediaItems = (items: MediaItem[], type: string) => {
    return (
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold text-white">{item.title}</div>
                <div className="text-xs text-gray-400 mt-1">
                  ID: {item.id} | Size: {formatFileSize(item.file_size)} | 
                  Last Scanned: {formatDate(item.last_scanned)}
                </div>
              </div>
              {item.metadata_json && (
                <button
                  onClick={() => setExpanded(expanded === `${type}-${item.id}` ? null : `${type}-${item.id}`)}
                  className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  {expanded === `${type}-${item.id}` ? 'Hide' : 'Show'} Metadata
                </button>
              )}
            </div>
            
            {item.metadata && expanded === `${type}-${item.id}` && (
              <div className="mt-3 p-3 bg-gray-900 rounded text-xs">
                <div className="grid grid-cols-2 gap-2 text-gray-300">
                  <div><span className="text-gray-500">TMDB ID:</span> {item.metadata.tmdb_id}</div>
                  <div><span className="text-gray-500">Release:</span> {item.metadata.release_year}</div>
                  <div><span className="text-gray-500">Rating:</span> {item.metadata.rating}/10 ({item.metadata.vote_count} votes)</div>
                  <div><span className="text-gray-500">Genres:</span> {item.metadata.genres?.join(', ')}</div>
                </div>
                {item.metadata.overview && (
                  <div className="mt-2">
                    <div className="text-gray-500 mb-1">Overview:</div>
                    <div className="text-gray-300">{item.metadata.overview}</div>
                  </div>
                )}
                {item.metadata.poster_url && (
                  <div className="mt-2">
                    <div className="text-gray-500 mb-1">Poster URL:</div>
                    <a href={item.metadata.poster_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                      {item.metadata.poster_url}
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {!item.metadata_json && (
              <div className="mt-2 text-xs text-yellow-500">No metadata available</div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Database Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">TV Shows</div>
            <div className="text-white text-xl font-bold">{data.summary.tvShowsTotal}</div>
            <div className="text-xs text-gray-500">{data.summary.tvShowsWithMetadata} with metadata</div>
          </div>
          <div>
            <div className="text-gray-400">Movies</div>
            <div className="text-white text-xl font-bold">{data.summary.moviesTotal}</div>
            <div className="text-xs text-gray-500">{data.summary.moviesWithMetadata} with metadata</div>
          </div>
          <div>
            <div className="text-gray-400">Books</div>
            <div className="text-white text-xl font-bold">{data.summary.booksTotal}</div>
            <div className="text-xs text-gray-500">{data.summary.booksWithMetadata} with metadata</div>
          </div>
        </div>
      </div>

      {/* Movies */}
      {data.movies.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Movies ({data.movies.length})</h3>
          {renderMediaItems(data.movies, 'movie')}
        </div>
      )}

      {/* TV Shows */}
      {data.tvShows.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">TV Shows ({data.tvShows.length})</h3>
          {renderMediaItems(data.tvShows, 'tv')}
        </div>
      )}

      {/* Books */}
      {data.books.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Books ({data.books.length})</h3>
          {renderMediaItems(data.books, 'book')}
        </div>
      )}

      <button
        onClick={fetchData}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Refresh Data
      </button>
    </div>
  )
}
