import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'
import { showToast } from './Toast'

interface BookDetailProps {
  bookId: string
  onBack: () => void
}

interface BookMetadata {
  hardcover_id?: number
  title?: string
  subtitle?: string | null
  description?: string | null
  authors?: string[]
  series?: string | null
  series_position?: number | null
  pages?: number | null
  isbn_10?: string | null
  isbn_13?: string | null
  release_date?: string | null
  cover_url?: string | null
  publisher?: string | null
  language?: string | null
  genres?: string[]
}

interface BookData {
  id: string
  title: string
  path: string
  type?: string
  fileSize?: number
  author?: { id?: number; name?: string } | null
  series?: { id: number; name: string } | null
  coverUrl?: string | null
  metadata?: BookMetadata | null
}

interface BookFile {
  name: string
  isDirectory: boolean
  size: number
  modifiedAt: string
}

export default function BookDetail({ bookId, onBack }: BookDetailProps) {
  const [book, setBook] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [clearingMetadata, setClearingMetadata] = useState(false)
  const [files, setFiles] = useState<BookFile[]>([])
  const [filesExpanded, setFilesExpanded] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)

  useEffect(() => {
    fetchBookDetails()
  }, [bookId])

  const fetchBookDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/${encodeURIComponent(bookId)}`)
      if (!response.ok) {
        setBook(null)
        return
      }
      const data = await response.json()
      setBook({
        id: data.id,
        title: data.title,
        path: data.path,
        type: data.type,
        fileSize: data.fileSize,
        author: data.author,
        series: data.series,
        coverUrl: data.coverUrl,
        metadata: data.metadata || null
      })
    } catch (err) {
      console.error(err)
      setBook(null)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    const gb = bytes / (1024 * 1024 * 1024)
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(2)} MB`
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  const handleFetchMetadata = async () => {
    if (!book) return

    setFetchingMetadata(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/${encodeURIComponent(book.id)}/metadata`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch metadata')
      }

      const result = await response.json()

      // Update book state with new metadata
      setBook(prev => prev ? { ...prev, metadata: result.metadata } : null)

      showToast(`Metadata fetched for ${result.metadata.title || book.title}`, 'success')
    } catch (error: any) {
      console.error('Failed to fetch metadata:', error)
      showToast(error.message || `Failed to fetch metadata for ${book.title}`, 'error')
    } finally {
      setFetchingMetadata(false)
    }
  }

  const handleClearMetadata = async () => {
    if (!book) return

    setClearingMetadata(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/${encodeURIComponent(book.id)}/metadata/clear`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to clear metadata')
      }

      await response.json()

      // Refresh book data to ensure it's cleared
      await fetchBookDetails()

      showToast(`Metadata cleared for ${book.title}`, 'success')
    } catch (error) {
      console.error('Failed to clear metadata:', error)
      showToast(`Failed to clear metadata for ${book.title}`, 'error')
    } finally {
      setClearingMetadata(false)
    }
  }

  const fetchFiles = async () => {
    if (!book || files.length > 0) return

    setLoadingFiles(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/${encodeURIComponent(book.id)}/files`)
      const data = await response.json()

      if (response.ok) {
        setFiles(data.files || [])
      } else {
        showToast('Failed to load book files', 'error')
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
      showToast('Failed to load book files', 'error')
    } finally {
      setLoadingFiles(false)
    }
  }

  const toggleFiles = () => {
    if (!filesExpanded) {
      fetchFiles()
    }
    setFilesExpanded(!filesExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
        >
          ← Back to Books
        </button>
        <p className="text-gray-600 dark:text-gray-400">Book not found</p>
      </div>
    )
  }

  const metadata = book.metadata

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Books
      </button>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Left Sidebar - Cover & Quick Info */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {/* Cover Image */}
            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-xl overflow-hidden mb-6">
              {metadata?.cover_url ? (
                <img 
                  src={metadata.cover_url} 
                  alt={metadata.title || book.title}
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              )}
            </div>

            {/* Metadata section */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Metadata</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleFetchMetadata}
                    disabled={fetchingMetadata}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {fetchingMetadata ? 'Fetching...' : metadata ? 'Refresh' : 'Fetch'}
                  </button>
                  {metadata && (
                    <button
                      onClick={handleClearMetadata}
                      disabled={clearingMetadata}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {clearingMetadata ? 'Clearing...' : 'Clear'}
                    </button>
                  )}
                </div>
              </div>
              {metadata ? (
                <dl className="space-y-2 text-xs">
                  {metadata.release_date && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Published</dt>
                      <dd className="text-gray-900 dark:text-white">{formatDate(metadata.release_date)}</dd>
                    </div>
                  )}
                  {metadata.authors && metadata.authors.length > 0 && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Authors</dt>
                      <dd className="text-gray-900 dark:text-white">{metadata.authors.join(', ')}</dd>
                    </div>
                  )}
                  {metadata.series && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Series</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {metadata.series}{metadata.series_position && ` (Book ${metadata.series_position})`}
                      </dd>
                    </div>
                  )}
                  {metadata.pages && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Pages</dt>
                      <dd className="text-gray-900 dark:text-white">{metadata.pages.toLocaleString()}</dd>
                    </div>
                  )}
                  {metadata.publisher && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Publisher</dt>
                      <dd className="text-gray-900 dark:text-white">{metadata.publisher}</dd>
                    </div>
                  )}
                  {metadata.language && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Language</dt>
                      <dd className="text-gray-900 dark:text-white capitalize">{metadata.language}</dd>
                    </div>
                  )}
                  {metadata.genres && metadata.genres.length > 0 && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Genres</dt>
                      <dd className="text-gray-900 dark:text-white">{metadata.genres.join(', ')}</dd>
                    </div>
                  )}
                  {metadata.hardcover_id && (
                    <div>
                      <dt className="font-medium text-gray-600 dark:text-gray-400">Hardcover</dt>
                      <dd className="text-gray-900 dark:text-white">
                        <a 
                          href={`https://hardcover.app/books/${metadata.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View on Hardcover
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">No metadata available</p>
              )}
            </div>

            {/* ISBN Info */}
            {(metadata?.isbn_13 || metadata?.isbn_10) && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">ISBN</h3>
                <div className="space-y-2">
                  {metadata.isbn_13 && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">ISBN-13</div>
                      <div className="text-sm font-mono text-gray-900 dark:text-white">{metadata.isbn_13}</div>
                    </div>
                  )}
                  {metadata.isbn_10 && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">ISBN-10</div>
                      <div className="text-sm font-mono text-gray-900 dark:text-white">{metadata.isbn_10}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Title & Author */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {metadata?.title || book.title}
            </h1>
            {metadata?.subtitle && (
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4 italic">{metadata.subtitle}</p>
            )}
            {metadata?.authors && metadata.authors.length > 0 && (
              <div className="flex items-center gap-2 text-lg text-gray-700 dark:text-gray-300">
                <span className="text-gray-500 dark:text-gray-400">by</span>
                <span className="font-medium">{metadata.authors.join(', ')}</span>
              </div>
            )}
            {metadata?.series && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm font-medium">
                {metadata.series}
                {metadata.series_position && ` - Book ${metadata.series_position}`}
              </div>
            )}
          </div>

          {/* Genres */}
          {metadata?.genres && metadata.genres.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Genres
              </h2>
              <div className="flex flex-wrap gap-2">
                {metadata.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {metadata?.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Description
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {metadata.description}
                </p>
              </div>
            </div>
          )}

          {/* File Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">File Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Directory Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{book.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">File Path</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">{book.path}</dd>
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

          {/* Directory Contents */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <button
              onClick={toggleFiles}
              className="w-full flex items-center justify-between text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-4"
            >
              <span>Directory Contents</span>
              <svg
                className={`w-5 h-5 transition-transform ${filesExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filesExpanded && (
              <div className="space-y-1">
                {loadingFiles ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-2">Loading files...</p>
                ) : files.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {file.isDirectory ? (
                            <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                          <span className="text-sm text-gray-900 dark:text-white truncate font-mono">
                            {file.name}
                          </span>
                        </div>
                        {!file.isDirectory && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                            {formatBytes(file.size)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-2">No files found</p>
                )}
              </div>
            )}
          </div>

          {/* No Metadata Notice */}
          {!metadata && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-500 mb-1">No metadata available</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-600">
                    Metadata fetching may be disabled or no match was found on Hardcover. Enable metadata scanning in settings and rescan to fetch book details.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
