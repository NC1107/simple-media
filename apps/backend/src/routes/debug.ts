import { FastifyInstance } from 'fastify'
import { getMediaItemsByType, getAllAuthors, getSeriesByAuthor, getBooksBySeriesId, getAllBooks } from '../db.js'

export async function debugRoutes(fastify: FastifyInstance) {
  // Debug endpoint - Get raw database entries with metadata
  fastify.get('/api/debug/database', async (request, reply) => {
    try {
      // Legacy media_items
      const tvShows = await getMediaItemsByType('tv_show')
      const movies = await getMediaItemsByType('movie')
      const audiobooks = await getMediaItemsByType('audiobook')
      const ebooks = await getMediaItemsByType('ebook')
      const legacyBooks = [...audiobooks, ...ebooks]

      // New hierarchical structure
      const authors = await getAllAuthors()
      const allHierarchicalBooks = await getAllBooks()
      
      // Build author details with series and books
      const authorsWithDetails = await Promise.all(
        authors.map(async (author) => {
          const series = await getSeriesByAuthor(author.id as number)
          const authorBooks = allHierarchicalBooks.filter(b => b.author_id === author.id)
          const standaloneBooks = authorBooks.filter(b => !b.series_id)
          
          const seriesWithBooks = await Promise.all(
            series.map(async (s) => {
              const seriesBooks = await getBooksBySeriesId(s.id as number)
              return {
                id: s.id,
                name: s.name,
                bookCount: seriesBooks.length,
                books: seriesBooks.map(b => ({
                  id: b.id,
                  title: b.title,
                  type: b.type,
                  path: b.path,
                  metadata: b.metadata_json ? JSON.parse(b.metadata_json) : null
                }))
              }
            })
          )
          
          return {
            id: author.id,
            name: author.name,
            metadata: author.metadata_json ? JSON.parse(author.metadata_json) : null,
            seriesCount: series.length,
            bookCount: authorBooks.length,
            standaloneCount: standaloneBooks.length,
            series: seriesWithBooks,
            standaloneBooks: standaloneBooks.map(b => ({
              id: b.id,
              title: b.title,
              type: b.type,
              path: b.path,
              metadata: b.metadata_json ? JSON.parse(b.metadata_json) : null
            }))
          }
        })
      )

      return {
        legacy: {
          tvShows: tvShows.map(item => ({
            ...item,
            metadata: item.metadata_json ? JSON.parse(item.metadata_json) : null
          })),
          movies: movies.map(item => ({
            ...item,
            metadata: item.metadata_json ? JSON.parse(item.metadata_json) : null
          })),
          books: legacyBooks.map(item => ({
            ...item,
            metadata: item.metadata_json ? JSON.parse(item.metadata_json) : null
          }))
        },
        hierarchical: {
          authors: authorsWithDetails
        },
        summary: {
          legacy: {
            tvShowsTotal: tvShows.length,
            tvShowsWithMetadata: tvShows.filter(item => item.metadata_json).length,
            moviesTotal: movies.length,
            moviesWithMetadata: movies.filter(item => item.metadata_json).length,
            booksTotal: legacyBooks.length,
            booksWithMetadata: legacyBooks.filter(item => item.metadata_json).length
          },
          hierarchical: {
            authorsTotal: authors.length,
            seriesTotal: authorsWithDetails.reduce((sum, a) => sum + a.seriesCount, 0),
            booksTotal: allHierarchicalBooks.length,
            booksWithMetadata: allHierarchicalBooks.filter(item => item.metadata_json).length,
            audiobooksCount: allHierarchicalBooks.filter(b => b.type === 'audiobook').length,
            ebooksCount: allHierarchicalBooks.filter(b => b.type === 'ebook').length,
            standaloneCount: authorsWithDetails.reduce((sum, a) => sum + a.standaloneCount, 0)
          }
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch database data' })
    }
  })
}
