import { FastifyInstance } from 'fastify'
import { getAllSettings, setSetting, getMediaStats } from '../db.js'

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get all settings
  fastify.get('/api/settings', async (request, reply) => {
    try {
      fastify.log.info('Fetching all settings')
      const settings = await getAllSettings()
      fastify.log.info('Settings fetched successfully')
      return settings
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch settings')
      return reply.status(500).send({ error: 'Failed to fetch settings' })
    }
  })

  // Update a setting
  fastify.post('/api/settings', async (request, reply) => {
    try {
      const { key, value } = request.body as { key: string; value: string }

      if (!key || value === undefined) {
        return reply.status(400).send({ error: 'Key and value are required' })
      }

      fastify.log.info(`Updating setting: ${key} = ${value}`)
      await setSetting(key, value)
      fastify.log.info(`Setting ${key} updated successfully`)

      return { success: true, key, value }
    } catch (error) {
      fastify.log.error(error, 'Failed to update setting')
      return reply.status(500).send({ error: 'Failed to update setting' })
    }
  })

  // Test TMDB/TVDB/Hardcover API connections
  fastify.get('/api/test-api-connections', async (request, reply) => {
    try {
      const { testTMDBConnection } = await import('../tmdb.js')
      const { testTVDBConnection } = await import('../tvdb.js')
      const { testHardcoverConnection } = await import('../hardcover.js')

      const [tmdbResult, tvdbResult, hardcoverResult] = await Promise.all([
        testTMDBConnection(),
        testTVDBConnection(),
        testHardcoverConnection()
      ])

      return {
        tmdb: tmdbResult,
        tvdb: tvdbResult,
        hardcover: hardcoverResult
      }
    } catch (error) {
      fastify.log.error(error, 'Failed to test API connections')
      return reply.status(500).send({ error: 'Failed to test connections' })
    }
  })

  // Dashboard stats endpoint
  fastify.get('/api/stats', async (request, reply) => {
    try {
      const stats = await getMediaStats()
      return stats
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to fetch stats' })
    }
  })
}