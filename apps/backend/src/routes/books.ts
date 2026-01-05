import { FastifyInstance } from 'fastify'
import { getMediaItemsByType } from '../db.js'

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
}