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

      // Search across all media types
      const result = await database.db.execute({
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

      const results = result.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        path: row.path,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null
      }))

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
