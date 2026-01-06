import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import { getImageUrl } from '../utils/imageUrl'
import { showToast } from './Toast'
import type { Book, SeriesResponse } from '../types'

interface AuthorDetailProps {}

export default function AuthorDetail({}: AuthorDetailProps) {
  const { authorId } = useParams<{ authorId: string }>()
  const navigate = useNavigate()
  const [authorName, setAuthorName] = useState<string>('')
  const [authorImageUrl, setAuthorImageUrl] = useState<string | null>(null)
  const [authorDescription, setAuthorDescription] = useState<string | null>(null)
  const [audiobooks, setAudiobooks] = useState<Book[]>([])
  const [ebooks, setEbooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'audiobooks' | 'ebooks' | 'series'>('audiobooks')
  const [seriesData, setSeriesData] = useState<{ [seriesName: string]: Book[] }>({})
  const [standaloneBooks, setStandaloneBooks] = useState<Book[]>([])
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (authorId) {
      fetchAuthorData()
    }
  }, [authorId])

  const fetchAuthorData = async () => {
    try {
      // Fetch series
      const seriesResponse = await fetch(`${API_BASE_URL}/api/books/authors/${authorId}/series`)
      const seriesData: SeriesResponse = await seriesResponse.json()

      if (seriesData.series.length > 0) {
        setAuthorName(seriesData.series[0].authorName)
      }

      // Fetch audiobooks
      const audiobooksResponse = await fetch(`${API_BASE_URL}/api/books/authors/${authorId}/audiobooks`)
      const audiobooksData = await audiobooksResponse.json()
      setAudiobooks(audiobooksData.books || [])

      // Fetch ebooks
      const ebooksResponse = await fetch(`${API_BASE_URL}/api/books/authors/${authorId}/ebooks`)
      const ebooksData = await ebooksResponse.json()
      setEbooks(ebooksData.books || [])

      // If we don't have author name from series, try to get it from first book
      if (!authorName) {
        const firstBook = audiobooksData.books[0] || ebooksData.books[0]
        if (firstBook) {
          const bookResponse = await fetch(`${API_BASE_URL}/api/books/${firstBook.id}`)
          const bookData = await bookResponse.json()
          if (bookData.author) {
            setAuthorName(bookData.author.name)
          }
        }
      }

      // Fetch author image and metadata from the authors endpoint
      const authorsResponse = await fetch(`${API_BASE_URL}/api/books/authors`)
      const authorsData = await authorsResponse.json()
      const author = authorsData.authors.find((a: any) => a.id === parseInt(authorId as string))
      console.log('Author data fetched:', author)
      if (author?.imageUrl) {
        setAuthorImageUrl(author.imageUrl)
      }
      if (author?.metadata?.description) {
        console.log('Setting author description:', author.metadata.description)
        setAuthorDescription(author.metadata.description)
      } else {
        console.log('No author description found. Author:', author, 'Metadata:', author?.metadata)
      }
    } catch (err) {
      setError('Failed to load author details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSeriesData = () => {
    // Combine all books (audiobooks and ebooks)
    const allBooks = [...audiobooks, ...ebooks]
    
    // Group books by series name from metadata
    const grouped: { [seriesName: string]: Book[] } = {}
    const booksWithoutSeries: Book[] = []
    
    allBooks.forEach(book => {
      if (book.metadata?.series) {
        const seriesName = book.metadata.series
        if (!grouped[seriesName]) {
          grouped[seriesName] = []
        }
        grouped[seriesName].push(book)
      } else {
        booksWithoutSeries.push(book)
      }
    })
    
    // Filter to only series with 2+ books and deduplicate by title
    const filtered: { [seriesName: string]: Book[] } = {}
    const standalone: Book[] = []
    
    Object.entries(grouped).forEach(([seriesName, books]) => {
      // Deduplicate by title - prefer book with cover, then audiobook
      const uniqueBooks = new Map<string, Book>()
      books.forEach(book => {
        const existing = uniqueBooks.get(book.title)
        if (!existing) {
          uniqueBooks.set(book.title, book)
        } else {
          // Prefer book with cover
          if (book.coverUrl && !existing.coverUrl) {
            uniqueBooks.set(book.title, book)
          } else if (book.coverUrl === existing.coverUrl && book.type === 'audiobook') {
            // If both have same cover status, prefer audiobook
            uniqueBooks.set(book.title, book)
          }
        }
      })
      
      const deduped = Array.from(uniqueBooks.values())
      if (deduped.length >= 2) {
        // Sort books by series position
        filtered[seriesName] = deduped.sort((a, b) => {
          const posA = a.metadata?.series_position || 0
          const posB = b.metadata?.series_position || 0
          return posA - posB
        })
      } else {
        // Add to standalone if series has only 1 book
        standalone.push(...deduped)
      }
    })
    
    // Add books without any series metadata
    standalone.push(...booksWithoutSeries)
    
    setSeriesData(filtered)
    setStandaloneBooks(standalone)
  }

  const handleScanBooks = async () => {
    if (!authorId) return
    
    setScanning(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/authors/${authorId}/refresh-metadata`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to refresh metadata')
      }

      const result = await response.json()
      showToast(`Metadata refreshed for ${result.successCount} books`, 'success')
      
      // Refresh the author data
      await fetchAuthorData()
      
      // Reset series data so it gets refetched
      setSeriesData({})
      setStandaloneBooks([])
    } catch (err) {
      console.error('Failed to refresh metadata:', err)
      showToast('Failed to refresh metadata', 'error')
    } finally {
      setScanning(false)
    }
  }

  const handleBookClick = (bookId: string) => {
    navigate(`/books/${bookId}`, { state: { from: `/books/authors/${authorId}` } })
  }

  const handleBack = () => {
    navigate('/books')
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb and Scan Button */}
      <div className="flex justify-between items-center mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <button onClick={handleBack} className="hover:text-blue-600 dark:hover:text-blue-400">
            Books
          </button>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{authorName}</span>
        </nav>
        <button
          onClick={handleScanBooks}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {scanning ? 'Scanning...' : 'Scan Books'}
        </button>
      </div>

      {/* Three-column grid layout */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* LEFT SIDEBAR */}
        <div className="md:col-span-1">
          {/* Author Image */}
          <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-6 shadow-lg">
            {authorImageUrl ? (
              <img
                src={authorImageUrl}
                alt={authorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Author Info Card */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Author Info</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Audiobooks</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{audiobooks.length}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Ebooks</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{ebooks.length}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-gray-400">Total Books</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {audiobooks.length + ebooks.length}
                </dd>
              </div>
            </dl>

            {authorDescription && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Bio</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {authorDescription}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="md:col-span-2 space-y-6">
          {/* Author Name */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{authorName}</h1>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('audiobooks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'audiobooks'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Audiobooks ({audiobooks.length})
              </button>
              <button
                onClick={() => setActiveTab('ebooks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'ebooks'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Ebooks ({ebooks.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('series')
                  if (Object.keys(seriesData).length === 0) {
                    fetchSeriesData()
                  }
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'series'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Series
              </button>
            </nav>
          </div>

          {/* Audiobooks Tab */}
          {activeTab === 'audiobooks' && (
            <div>
              {audiobooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {audiobooks.map((book) => (
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
                            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {book.title}
                      </h3>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    No audiobooks found for this author.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ebooks Tab */}
          {activeTab === 'ebooks' && (
            <div>
              {ebooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {ebooks.map((book) => (
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
                            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {book.title}
                      </h3>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    No ebooks found for this author.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Series Tab */}
          {activeTab === 'series' && (
            <div className="space-y-8">
              {Object.keys(seriesData).length > 0 && (
                Object.entries(seriesData).map(([seriesName, books]) => (
                  <div key={seriesName} className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {seriesName}
                      <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                        ({books.length} {books.length === 1 ? 'book' : 'books'})
                      </span>
                    </h3>
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
                                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                            )}
                            {book.metadata?.series_position && (
                              <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                                #{book.metadata.series_position}
                              </div>
                            )}
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {book.title}
                          </h3>
                          {book.type && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {book.type === 'audiobook' ? 'Audiobook' : 'Ebook'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              
              {/* Standalone Books Section */}
              {standaloneBooks.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Standalone Books
                    <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                      ({standaloneBooks.length} {standaloneBooks.length === 1 ? 'book' : 'books'})
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {standaloneBooks.map((book) => (
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
                              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {book.title}
                        </h3>
                        {book.type && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {book.type === 'audiobook' ? 'Audiobook' : 'Ebook'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {Object.keys(seriesData).length === 0 && standaloneBooks.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    No series with 2 or more books found for this author.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
