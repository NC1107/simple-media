import { FastifyInstance } from 'fastify'
import { getDatabase } from '../db.js'

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get('/api/search', async (request, reply) => {
    try {
      const { q } = request.query as { q?: string }
      
      if (!q || q.trim().length < 2) {
        return { results: [], total: 0 }
      }

      const database = getDatabase()
      const searchTerm = `%${q.trim()}%`

      // Search across legacy media_items (TV shows, movies)
      const legacyResult = await database.db.execute({
        sql: `SELECT id, type, title, path, metadata_json 
              FROM media_items 
              WHERE title LIKE ? 
              ORDER BY 
                CASE 
                  WHEN title LIKE ? THEN 1
                  ELSE 2
                END,
                title 
              LIMIT 20`,
        args: [searchTerm, `${q.trim()}%`]
      })

      // Search hierarchical books table
      const booksResult = await database.db.execute({
        sql: `SELECT b.id, b.type, b.title, b.path, b.metadata_json 
              FROM books b
              LEFT JOIN authors a ON b.author_id = a.id
              WHERE b.title LIKE ? AND (a.name IS NULL OR b.title != a.name)
              ORDER BY 
                CASE 
                  WHEN b.title LIKE ? THEN 1
                  ELSE 2
                END,
                b.title 
              LIMIT 20`,
        args: [searchTerm, `${q.trim()}%`]
      })

      // Search authors
      const authorsResult = await database.db.execute({
        sql: `SELECT id, name, metadata_json 
              FROM authors 
              WHERE name LIKE ? 
              ORDER BY 
                CASE 
                  WHEN name LIKE ? THEN 1
                  ELSE 2
                END,
                name 
              LIMIT 10`,
        args: [searchTerm, `${q.trim()}%`]
      })

      const legacyResults = legacyResult.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        path: row.path,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null
      }))

      const bookResults = booksResult.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        path: row.path,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null
      }))

      const authorResults = authorsResult.rows.map((row: any) => {
        const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : null
        return {
          id: row.id,
          type: 'author' as const,
          title: row.name,
          path: `/books/authors/${row.id}`,
          metadata: metadata ? { image_url: metadata.image_url } : null
        }
      })

      const results = [...authorResults, ...bookResults, ...legacyResults]

      return {
        results,
        total: results.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Search failed' })
    }
  })
}
