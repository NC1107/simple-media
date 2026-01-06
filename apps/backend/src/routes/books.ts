import { FastifyInstance } from 'fastify'
import { getMediaItemsByType, getMediaItemByIdOrPath, insertMediaItem } from '../db.js'
import { searchBook } from '../hardcover.js'
import path from 'path'
import fs from 'fs/promises'

export async function bookRoutes(fastify: FastifyInstance) {
  // Get books from media directory
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

  // Fetch metadata for a single book
  fastify.post('/api/books/:bookId/metadata', async (request, reply) => {
    try {
      const { bookId } = request.params as { bookId: string }
      const book = await getMediaItemByIdOrPath(bookId)

      if (!book) {
        return reply.status(404).send({ error: 'Book not found' })
      }

      fastify.log.info(`Fetching metadata for book: ${book.title}`)

      // Search for book metadata on Hardcover
      const metadata = await searchBook(book.title)

      if (!metadata) {
        return reply.status(404).send({ error: 'No metadata found for this book' })
      }

      // Update the book in the database with metadata
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
        metadata: {
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
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch book metadata' })
    }
  })

  // Clear metadata for a single book
  fastify.post('/api/books/:bookId/metadata/clear', async (request, reply) => {
    try {
      const { bookId } = request.params as { bookId: string }
      const book = await getMediaItemByIdOrPath(bookId)

      if (!book) {
        return reply.status(404).send({ error: 'Book not found' })
      }

      fastify.log.info(`Clearing metadata for book: ${book.title}`)

      // Update the book to remove metadata
      await insertMediaItem({
        type: book.type as 'audiobook' | 'ebook',
        title: book.title,
        path: book.path,
        file_size: book.file_size,
        last_scanned: Date.now(),
        metadata_json: null
      })

      return {
        success: true,
        cleared: 1
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
      const book = await getMediaItemByIdOrPath(bookId)

      if (!book) {
        return reply.status(404).send({ error: 'Book not found' })
      }

      // The book.path already includes the audiobooks/ebooks prefix
      // e.g., "ebooks/Author/Series" or "audiobooks/Author/Series"
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
        fastify.log.error(`Failed to read directory: ${bookDirPath}`, err)
        return reply.status(404).send({ error: 'Book directory not found or inaccessible' })
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get book files' })
    }
  })
}