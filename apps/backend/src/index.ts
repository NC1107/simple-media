import Fastify from 'fastify'
import cors from '@fastify/cors'
import { initDatabase, cleanupInvalidSettings } from './db.js'
import { scanAllMedia } from './scanner.js'
import { registerRoutes } from './routes/index.js'

const fastify = Fastify({
  logger: true
})

// Enable CORS for frontend
await fastify.register(cors, {
  origin: true
})

// Health check endpoint
fastify.get('/api/health', async () => {
  return { status: 'ok', service: 'simple-media-backend' }
})

// Basic API endpoint
fastify.get('/api/media', async () => {
  return {
    message: 'Media endpoint working',
    items: []
  }
})

// Register all routes
await registerRoutes(fastify)

const start = async () => {
  try {
    // Initialize database
    const dbPath = process.env.DB_PATH || './data/media.sqlite'
    fastify.log.info(`Initializing database at ${dbPath}`)
    await initDatabase(dbPath)
    fastify.log.info('Database initialized successfully')

    // Clean up invalid settings
    const cleaned = await cleanupInvalidSettings()
    if (cleaned > 0) {
      fastify.log.info(`Cleaned up ${cleaned} invalid settings`)
    }

    // Start server
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
    fastify.log.info('Server running on http://localhost:3001')

    // Perform initial scan in background
    if (process.env.SKIP_INITIAL_SCAN !== 'true') {
      const tvPath = process.env.TV_SHOWS_PATH || '/tv'
      const moviesPath = process.env.MOVIES_PATH || '/movies'
      const booksPath = process.env.BOOKS_PATH || '/books'

      fastify.log.info('Performing initial media scan in background (no metadata)...')
      scanAllMedia(tvPath, moviesPath, booksPath, true)
        .then((scanResults) => {
          fastify.log.info(`Initial scan completed: TV ${scanResults.tvShows.added}/${scanResults.tvShows.updated}, Movies ${scanResults.movies.added}/${scanResults.movies.updated}, Books ${scanResults.books.added}/${scanResults.books.updated}`)
        })
        .catch((err) => {
          fastify.log.error(err, 'Initial scan failed')
        })
    } else {
      fastify.log.info('Skipping initial media scan (SKIP_INITIAL_SCAN=true)')
    }
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
