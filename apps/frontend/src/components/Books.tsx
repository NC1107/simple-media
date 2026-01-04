import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

interface Book {
  id: string
  name: string
  path: string
}

interface BooksResponse {
  books: Book[]
  total: number
  message?: string
}

interface BooksProps {
  onBookSelect: (bookId: string) => void
}

export default function Books({ onBookSelect }: BooksProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/books`)
      const data: BooksResponse = await response.json()
      
      if (data.message) {
        setError(data.message)
      }
      
      setBooks(data.books || [])
    } catch (err) {
      setError('Failed to load books')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Loading books...</p>
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

  if (books.length === 0) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">No books found</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Books ({books.length})
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {books.map((book) => (
          <div
            key={book.id}
            onClick={() => onBookSelect(book.id)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer"
          >
            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={book.name}>
              {book.name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  )
}
