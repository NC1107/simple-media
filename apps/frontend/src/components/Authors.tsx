import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import { showToast } from './Toast'
import type { Author, AuthorsResponse } from '../types'

interface AuthorsProps {}

export default function Authors({}: AuthorsProps) {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAuthors()
  }, [])

  const fetchAuthors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/authors`)
      const data: AuthorsResponse = await response.json()

      setAuthors(data.authors || [])
    } catch (err) {
      setError('Failed to load authors')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    setScanning(true)

    // Connect to SSE endpoint for progress updates
    const eventSource = new EventSource(`${API_BASE_URL}/api/scan/progress`)

    eventSource.onmessage = async (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'scanned' && data.category === 'books') {
        // Refresh the authors list to get updated data
        await fetchAuthors()
      } else if (data.type === 'complete' && data.category === 'books') {
        eventSource.close()
        setScanning(false)
        showToast('Authors scan complete', 'success')
        await fetchAuthors()
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setScanning(false)
      showToast('Scan connection error', 'error')
    }

    try {
      const scanUrl = `${API_BASE_URL}/api/scan/books`

      const response = await fetch(scanUrl, { method: 'POST' })

      if (!response.ok) {
        throw new Error('Scan failed')
      }
    } catch (err) {
      console.error('Scan error:', err)
      showToast('Failed to start scan', 'error')
      setScanning(false)
      eventSource.close()
    }
  }

  const handleAuthorClick = (authorId: number) => {
    navigate(`/books/authors/${authorId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading authors...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Authors ({authors.length})
        </h2>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? 'Scanning...' : 'Scan Authors'}
        </button>
      </div>

      {authors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No authors found. Click "Scan Authors" to scan your library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {authors.map((author) => (
            <div
              key={author.id}
              onClick={() => handleAuthorClick(author.id)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all p-4 cursor-pointer"
            >
              <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded mb-2 overflow-hidden flex items-center justify-center">
                {author.imageUrl ? (
                  <img
                    src={author.imageUrl}
                    alt={author.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={author.name}>
                {author.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
