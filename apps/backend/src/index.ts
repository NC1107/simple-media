import Fastify from 'fastify'
import cors from '@fastify/cors'
import fs from 'fs/promises'
import path from 'path'

const fastify = Fastify({
  logger: true
})

// Enable CORS for frontend
await fastify.register(cors, {
  origin: ['http://localhost:8100'] // Frontend URL
})

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', service: 'simple-media-backend' }
})

// Get TV shows from media directory
fastify.get('/api/tv-shows', async (request, reply) => {
  try {
    const tvPath = process.env.MEDIA_PATH || '/tv'
    
    // Check if directory exists
    try {
      await fs.access(tvPath)
    } catch {
      return { shows: [], message: 'TV directory not configured or not accessible' }
    }

    // Read directory contents
    const entries = await fs.readdir(tvPath, { withFileTypes: true })
    
    // Filter for directories only and map to show objects
    const shows = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        id: entry.name,
        name: entry.name,
        path: path.join(tvPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { shows, total: shows.length }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read TV shows directory' })
  }
})

// Basic API endpoint
fastify.get('/api/media', async (request, reply) => {
  return { 
    message: 'Media endpoint working',
    items: [] 
  }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
    console.log('Server running on http://localhost:3001')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()