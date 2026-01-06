import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import { getImageUrl } from '../utils/imageUrl'
import type { Book, SeriesBooksResponse } from '../types'

export default function SeriesDetail() {
  const { seriesId } = useParams<{ seriesId: string }>()
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [seriesName, setSeriesName] = useState<string>('')
  const [authorName, setAuthorName] = useState<string>('')
  const [authorId, setAuthorId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (seriesId) {
      fetchSeriesBooks()
    }
  }, [seriesId])

  const fetchSeriesBooks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/series/${seriesId}/books`)
      const data: SeriesBooksResponse = await response.json()

      setBooks(data.books || [])
      setSeriesName(data.seriesName)
      setAuthorName(data.authorName)

      // Get author ID from the first book
      if (data.books.length > 0 && data.books[0].author) {
        setAuthorId(data.books[0].author.id)
      }
    } catch (err) {
      setError('Failed to load series books')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBookClick = (bookId: string) => {
    navigate(`/books/${bookId}`)
  }

  const handleBack = () => {
    if (authorId) {
      navigate(`/books/authors/${authorId}`)
    } else {
      navigate('/books')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
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
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <button onClick={() => navigate('/books')} className="hover:text-blue-600 dark:hover:text-blue-400">
          Books
        </button>
        <span>/</span>
        {authorId && (
          <>
            <button onClick={() => navigate(`/books/authors/${authorId}`)} className="hover:text-blue-600 dark:hover:text-blue-400">
              {authorName}
            </button>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-white">{seriesName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={handleBack}
          className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{seriesName}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            by {authorName} • {books.length} {books.length === 1 ? 'book' : 'books'}
          </p>
        </div>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No books found in this series.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => handleBookClick(book.id)}
              className="cursor-pointer group"
            >
              <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-2 group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                {book.coverUrl ? (
                  <img
                    src={getImageUrl(book.coverUrl)}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <svg className="w-16 h-16 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                {book.title}
              </h3>
              {book.metadata?.series_position && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Book {book.metadata.series_position}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
