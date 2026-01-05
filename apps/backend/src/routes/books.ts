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
        books: books.map(book => ({
          id: book.id!.toString(),
          name: book.title,
          path: book.path,
          fileSize: book.file_size
        })),
        total: books.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to read books' })
    }
  })
}