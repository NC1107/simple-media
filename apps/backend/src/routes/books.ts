import { FastifyInstance } from 'fastify'
import { getMediaItemsByType, getMediaItemByIdOrPath, insertMediaItem, getAllAuthorsWithCounts, getAuthorById, getSeriesByAuthor, getBooksByAuthorId, getBooksByAuthorIdAndType, getBooksBySeriesId, getBookById, updateBook, getSeriesWithBookCount, updateAuthorMetadata } from '../db.js'
import { searchBook, fetchAuthorImage } from '../hardcover.js'
import { migrateOldBooksToHierarchy } from '../migration.js'
import path from 'path'
import fs from 'fs/promises'

export async function bookRoutes(fastify: FastifyInstance) {
  // =============================================================================
  // NEW HIERARCHICAL ENDPOINTS
  // =============================================================================

  // Get all authors with counts
  fastify.get('/api/books/authors', async (request, reply) => {
    try {
      const authors = await getAllAuthorsWithCounts()

      const authorsWithImages = await Promise.all(authors.map(async (author) => {
        let imageUrl: string | null = null
        let metadata: any = null

        try {
          metadata = author.metadata_json ? JSON.parse(author.metadata_json) : null
          imageUrl = metadata?.image_url || null

          if (!imageUrl) {
            const fetched = await fetchAuthorImage(author.name)
            if (fetched?.image_url || fetched?.description) {
              const updatedMeta = { ...metadata, ...fetched }
              imageUrl = fetched.image_url ?? null
              await updateAuthorMetadata(author.id, JSON.stringify(updatedMeta))
              metadata = updatedMeta
            }
          }
        } catch (e) {
          fastify.log.warn(e as Error, `Failed to parse/update metadata for author ${author.name}`)
        }

        return {
          id: author.id,
          name: author.name,
          bookCount: author.bookCount,
          seriesCount: author.seriesCount,
          imageUrl,
          metadata: metadata ? { image_url: metadata.image_url, description: metadata.description } : null
        }
      }))

      return {
        authors: authorsWithImages,
        total: authorsWithImages.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get authors' })
    }
  })

  // Get series for an author
  fastify.get('/api/books/authors/:authorId/series', async (request, reply) => {
    try {
      const { authorId } = request.params as { authorId: string }
      const author = await getAuthorById(parseInt(authorId))

      if (!author) {
        return reply.status(404).send({ error: 'Author not found' })
      }

      const seriesList = await getSeriesByAuthor(author.id as number)

      // Get book count for each series and first book cover
      const seriesWithDetails = await Promise.all(
        seriesList.map(async (series) => {
          const books = await getBooksBySeriesId(series.id as number)
          const firstBookWithCover = books.find(b => {
            if (!b.metadata_json) return false
            const metadata = JSON.parse(b.metadata_json)
            return metadata?.cover_url
          })
          const coverUrl = firstBookWithCover ? JSON.parse(firstBookWithCover.metadata_json!).cover_url : null

          return {
            id: series.id,
            name: series.name,
            bookCount: books.length,
            authorName: author.name,
            coverUrl
          }
        })
      )

      return {
        series: seriesWithDetails,
        total: seriesWithDetails.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get series' })
    }
  })

  // Get standalone books for an author
  fastify.get('/api/books/authors/:authorId/standalone', async (request, reply) => {
    try {
      const { authorId } = request.params as { authorId: string }
      const author = await getAuthorById(parseInt(authorId))

      if (!author) {
        return reply.status(404).send({ error: 'Author not found' })
      }

      const standaloneBooks = await getBooksByAuthorId(author.id as number, true)

      return {
        books: standaloneBooks.map(book => {
          const metadata = book.metadata_json ? JSON.parse(book.metadata_json) : null
          return {
            id: book.id!.toString(),
            title: book.title,
            type: book.type,
            path: book.path,
            fileSize: book.file_size,
            coverUrl: metadata?.cover_url || null,
            metadata
          }
        }),
        total: standaloneBooks.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get standalone books' })
    }
  })

  // Get audiobooks for an author (standalone only)
  fastify.get('/api/books/authors/:authorId/audiobooks', async (request, reply) => {
    try {
      const { authorId } = request.params as { authorId: string }
      const author = await getAuthorById(parseInt(authorId))

      if (!author) {
        return reply.status(404).send({ error: 'Author not found' })
      }

      const audiobooks = await getBooksByAuthorIdAndType(author.id as number, 'audiobook', true)

      return {
        books: audiobooks.map(book => {
          const metadata = book.metadata_json ? JSON.parse(book.metadata_json) : null
          return {
            id: book.id!.toString(),
            title: book.title,
            type: book.type,
            path: book.path,
            fileSize: book.file_size,
            coverUrl: metadata?.cover_url || null,
            metadata
          }
        }),
        total: audiobooks.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get audiobooks' })
    }
  })

  // Get ebooks for an author (standalone only)
  fastify.get('/api/books/authors/:authorId/ebooks', async (request, reply) => {
    try {
      const { authorId } = request.params as { authorId: string }
      const author = await getAuthorById(parseInt(authorId))

      if (!author) {
        return reply.status(404).send({ error: 'Author not found' })
      }

      const ebooks = await getBooksByAuthorIdAndType(author.id as number, 'ebook', true)

      return {
        books: ebooks.map(book => {
          const metadata = book.metadata_json ? JSON.parse(book.metadata_json) : null
          return {
            id: book.id!.toString(),
            title: book.title,
            type: book.type,
            path: book.path,
            fileSize: book.file_size,
            coverUrl: metadata?.cover_url || null,
            metadata
          }
        }),
        total: ebooks.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get ebooks' })
    }
  })

  // Get books in a series
  fastify.get('/api/books/series/:seriesId/books', async (request, reply) => {
    try {
      const { seriesId } = request.params as { seriesId: string }
      const seriesWithDetails = await getSeriesWithBookCount(parseInt(seriesId))

      if (!seriesWithDetails) {
        return reply.status(404).send({ error: 'Series not found' })
      }

      const books = await getBooksBySeriesId(parseInt(seriesId))

      return {
        books: books.map(book => {
          const metadata = book.metadata_json ? JSON.parse(book.metadata_json) : null
          return {
            id: book.id!.toString(),
            title: book.title,
            type: book.type,
            path: book.path,
            fileSize: book.file_size,
            coverUrl: metadata?.cover_url || null,
            metadata
          }
        }),
        total: books.length,
        seriesName: seriesWithDetails.series.name,
        authorName: seriesWithDetails.authorName
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get books in series' })
    }
  })

  // Get single book details (NEW - uses books table)
  fastify.get('/api/books/:bookId', async (request, reply) => {
    try {
      const { bookId } = request.params as { bookId: string }
      const book = await getBookById(parseInt(bookId))

      if (!book) {
        return reply.status(404).send({ error: 'Book not found' })
      }

      const author = await getAuthorById(book.author_id)
      const series = book.series_id ? await getSeriesWithBookCount(book.series_id) : null

      const metadata = book.metadata_json ? JSON.parse(book.metadata_json) : null

      return {
        id: book.id!.toString(),
        title: book.title,
        type: book.type,
        path: book.path,
        fileSize: book.file_size,
        author: {
          id: author?.id,
          name: author?.name
        },
        series: series ? {
          id: series.series.id,
          name: series.series.name
        } : null,
        coverUrl: metadata?.cover_url || null,
        metadata
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get book details' })
    }
  })

  // Migration endpoints
  fastify.post('/api/books/migrate', async (request, reply) => {
    try {
      const { mode } = request.body as { mode: 'auto' | 'fresh' }

      if (mode === 'auto') {
        const result = await migrateOldBooksToHierarchy()
        return result
      } else {
        // Fresh scan mode - just return success, user will trigger scan
        return {
          success: true,
          migratedCount: 0,
          errorCount: 0,
          errors: []
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Migration failed' })
    }
  })

  // Refresh metadata for all books by a specific author
  fastify.post('/api/books/authors/:authorId/refresh-metadata', async (request, reply) => {
    try {
      const { authorId } = request.params as { authorId: string }
      const author = await getAuthorById(parseInt(authorId))

      if (!author) {
        return reply.status(404).send({ error: 'Author not found' })
      }

      // Get all books for this author
      const books = await getBooksByAuthorId(author.id as number, false)
      
      fastify.log.info(`Refreshing metadata for ${books.length} books by ${author.name}`)

      let successCount = 0
      let errorCount = 0

      for (const book of books) {
        try {
          const metadata = await searchBook(book.title, author.name)
          
          if (metadata) {
            await updateBook({
              ...book,
              metadata_json: JSON.stringify(metadata),
              last_scanned: Date.now()
            })
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          fastify.log.error({ err, book: book.title }, 'Failed to fetch metadata for book')
          errorCount++
        }
      }

      return {
        success: true,
        total: books.length,
        successCount,
        errorCount
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to refresh metadata' })
    }
  })

  fastify.get('/api/books/migration-status', async (request, reply) => {
    try {
      const oldBooks = await getMediaItemsByType('audiobook')
      const oldEbooks = await getMediaItemsByType('ebook')
      const oldBooksCount = oldBooks.length + oldEbooks.length

      // Migration is complete when there are no books in media_items table
      return {
        migrationComplete: oldBooksCount === 0,
        oldBooksCount
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to check migration status' })
    }
  })

  // =============================================================================
  // LEGACY ENDPOINTS (for backwards compatibility)
  // =============================================================================

  // Get books from media directory (LEGACY - still uses media_items)
  fastify.get('/api/books', async (request, reply) => {
    try {
      const audiobooks = await getMediaItemsByType('audiobook')
      const ebooks = await getMediaItemsByType('ebook')
      const books = [...audiobooks, ...ebooks]

      return {
        books: books.map(book => {
          const metadata = book.metadata_json ? JSON.parse(book.metadata_json) : null
          return {
            id: book.id!.toString(),
            name: book.title,
            path: book.path,
            fileSize: book.file_size,
            type: book.type,
            coverUrl: metadata?.cover_url || null,
            metadata: metadata ? {
              hardcover_id: metadata.hardcover_id,
              title: metadata.title,
              subtitle: metadata.subtitle,
              description: metadata.description,
              authors: metadata.authors || [],
              series: metadata.series,
              series_position: metadata.series_position,
              pages: metadata.pages,
              isbn_10: metadata.isbn_10,
              isbn_13: metadata.isbn_13,
              release_date: metadata.release_date,
              cover_url: metadata.cover_url,
              publisher: metadata.publisher,
              language: metadata.language,
              genres: metadata.genres || []
            } : null
          }
        }),
        total: books.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to read books' })
    }
  })

  // Fetch metadata for a single book (UPDATED - works with both old and new structure)
  fastify.post('/api/books/:bookId/metadata', async (request, reply) => {
    try {
      const { bookId } = request.params as { bookId: string }

      // Try new books table first
      const newBook = await getBookById(parseInt(bookId))

      if (newBook) {
        // New hierarchical structure
        const author = await getAuthorById(newBook.author_id)
        fastify.log.info(`Fetching metadata for book: ${newBook.title}`)

        const metadata = await searchBook(newBook.title, author?.name)

        if (!metadata) {
          return reply.status(404).send({ error: 'No metadata found for this book' })
        }

        // Update the book with metadata
        await updateBook({
          ...newBook,
          metadata_json: JSON.stringify(metadata),
          last_scanned: Date.now()
        })

        return {
          success: true,
          metadata
        }
      } else {
        // Fallback to old media_items table
        const book = await getMediaItemByIdOrPath(bookId)

        if (!book) {
          return reply.status(404).send({ error: 'Book not found' })
        }

        fastify.log.info(`Fetching metadata for book: ${book.title}`)

        const pathParts = book.path.split(path.sep)
        const author = pathParts.length >= 2 ? pathParts[1] : undefined

        const metadata = await searchBook(book.title, author)

        if (!metadata) {
          return reply.status(404).send({ error: 'No metadata found for this book' })
        }

        await insertMediaItem({
          type: book.type as 'audiobook' | 'ebook',
          title: book.title,
          path: book.path,
          file_size: book.file_size,
          last_scanned: Date.now(),
          metadata_json: JSON.stringify(metadata)
        })

        return {
          success: true,
          metadata
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch book metadata' })
    }
  })

  // Clear metadata for a single book (UPDATED - works with both old and new structure)
  fastify.post('/api/books/:bookId/metadata/clear', async (request, reply) => {
    try {
      const { bookId } = request.params as { bookId: string }

      // Try new books table first
      const newBook = await getBookById(parseInt(bookId))

      if (newBook) {
        fastify.log.info(`Clearing metadata for book: ${newBook.title}`)

        await updateBook({
          ...newBook,
          metadata_json: undefined,
          last_scanned: Date.now()
        })

        return {
          success: true,
          cleared: 1
        }
      } else {
        // Fallback to old media_items table
        const book = await getMediaItemByIdOrPath(bookId)

        if (!book) {
          return reply.status(404).send({ error: 'Book not found' })
        }

        fastify.log.info(`Clearing metadata for book: ${book.title}`)

        await insertMediaItem({
          type: book.type as 'audiobook' | 'ebook',
          title: book.title,
          path: book.path,
          file_size: book.file_size,
          last_scanned: Date.now(),
          metadata_json: undefined
        })

        return {
          success: true,
          cleared: 1
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to clear book metadata' })
    }
  })

  // Get files in book directory
  fastify.get('/api/books/:bookId/files', async (request, reply) => {
    try {
      const { bookId } = request.params as { bookId: string }

      // Prefer new hierarchy table, fall back to legacy media_items
      const hierarchicalBook = await getBookById(parseInt(bookId))
      const legacyBook = hierarchicalBook ? null : await getMediaItemByIdOrPath(bookId)
      const book = hierarchicalBook || legacyBook

      if (!book) {
        return reply.status(404).send({ error: 'Book not found' })
      }

      // The book.path already includes the audiobooks/ebooks prefix
      // e.g., "ebooks/Author/Series/Title" or "audiobooks/Author/Title"
      const booksBasePath = process.env.BOOKS_PATH || '/books'
      const bookDirPath = path.join(booksBasePath, book.path)

      try {
        const entries = await fs.readdir(bookDirPath, { withFileTypes: true })
        const files = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(bookDirPath, entry.name)
            const stats = await fs.stat(fullPath)

            return {
              name: entry.name,
              isDirectory: entry.isDirectory(),
              size: stats.size,
              modifiedAt: stats.mtime.toISOString()
            }
          })
        )

        // Sort directories first, then files alphabetically
        files.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })

        return {
          files,
          path: book.path
        }
      } catch (err) {
        fastify.log.error(err as Error, `Failed to read directory: ${bookDirPath}`)
        return reply.status(404).send({ error: 'Book directory not found or inaccessible' })
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get book files' })
    }
  })
}