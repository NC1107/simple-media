import { FastifyInstance } from 'fastify'
import { getMediaItemsByType } from '../db.js'

export async function debugRoutes(fastify: FastifyInstance) {
  // Debug endpoint - Get raw database entries with metadata
  fastify.get('/api/debug/database', async (request, reply) => {
    try {
      const tvShows = await getMediaItemsByType('tv_show')
      const movies = await getMediaItemsByType('movie')
      const audiobooks = await getMediaItemsByType('audiobook')
      const ebooks = await getMediaItemsByType('ebook')
      const books = [...audiobooks, ...ebooks]

      return {
        tvShows: tvShows.map(item => ({
          ...item,
          metadata: item.metadata_json ? JSON.parse(item.metadata_json) : null
        })),
        movies: movies.map(item => ({
          ...item,
          metadata: item.metadata_json ? JSON.parse(item.metadata_json) : null
        })),
        books: books.map(item => ({
          ...item,
          metadata: item.metadata_json ? JSON.parse(item.metadata_json) : null
        })),
        summary: {
          tvShowsTotal: tvShows.length,
          tvShowsWithMetadata: tvShows.filter(item => item.metadata_json).length,
          moviesTotal: movies.length,
          moviesWithMetadata: movies.filter(item => item.metadata_json).length,
          booksTotal: books.length,
          booksWithMetadata: books.filter(item => item.metadata_json).length
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch database data' })
    }
  })
}
