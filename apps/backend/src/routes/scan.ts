import { FastifyInstance } from 'fastify'
import { getMediaStats, getDatabase } from '../db.js'
import { scanAllMedia, scanMovies, scanTVShows, scanBooks, setProgressCallback } from '../scanner.js'

// SSE listeners for scan progress
let scanProgressListeners: Array<(data: any) => void> = []

export function emitScanProgress(data: any) {
  scanProgressListeners.forEach(listener => listener(data))
}

export async function scanRoutes(fastify: FastifyInstance) {
  // Get scan status / info
  fastify.get('/api/scan', async (request, reply) => {
    try {
      const stats = await getMediaStats()
      return {
        database: {
          tvShows: stats.tvShows,
          movies: stats.movies,
          books: stats.books
        },
        message: 'Use POST /api/scan to trigger a rescan'
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to get scan info' })
    }
  })

  // Trigger manual scan of all media directories
  fastify.post('/api/scan', async (request, reply) => {
    try {
      const tvPath = process.env.TV_SHOWS_PATH || '/tv'
      const moviesPath = process.env.MOVIES_PATH || '/movies'
      const booksPath = process.env.BOOKS_PATH || '/books'

      fastify.log.info('Starting media scan...')

      setProgressCallback((data) => {
        emitScanProgress(data)
      })

      const results = await scanAllMedia(tvPath, moviesPath, booksPath, false)

      setProgressCallback(null)

      fastify.log.info('Media scan completed')
      emitScanProgress({ type: 'complete', results })

      return {
        success: true,
        results: {
          tvShows: {
            added: results.tvShows.added,
            updated: results.tvShows.updated,
            errors: results.tvShows.errors.length
          },
          movies: {
            added: results.movies.added,
            updated: results.movies.updated,
            errors: results.movies.errors.length
          },
          books: {
            added: results.books.added,
            updated: results.books.updated,
            errors: results.books.errors.length
          }
        }
      }
    } catch (error) {
      fastify.log.error(error)
      setProgressCallback(null)
      return reply.status(500).send({ error: 'Failed to scan media directories' })
    }
  })

  // SSE endpoint for scan progress
  fastify.get('/api/scan/progress', async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')

    const listener = (data: any) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    scanProgressListeners.push(listener)

    reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

    request.raw.on('close', () => {
      scanProgressListeners = scanProgressListeners.filter(l => l !== listener)
    })
  })

  // Scan movies only
  fastify.post('/api/scan/movies', async (request, reply) => {
    try {
      const moviesPath = process.env.MOVIES_PATH || '/movies'

      setProgressCallback(emitScanProgress)
      fastify.log.info('Starting movies scan...')
      const result = await scanMovies(moviesPath, false)
      fastify.log.info('Movies scan completed')
      emitScanProgress({ type: 'complete', category: 'movies' })

      return {
        success: true,
        added: result.added,
        updated: result.updated,
        errors: result.errors.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to scan movies directory' })
    }
  })

  // Scan TV shows only
  fastify.post('/api/scan/tv', async (request, reply) => {
    try {
      const tvPath = process.env.TV_SHOWS_PATH || '/tv'

      setProgressCallback(emitScanProgress)
      fastify.log.info('Starting TV shows scan...')
      const result = await scanTVShows(tvPath)
      fastify.log.info('TV shows scan completed')
      emitScanProgress({ type: 'complete', category: 'tv' })

      return {
        success: true,
        added: result.added,
        updated: result.updated,
        errors: result.errors.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to scan TV shows directory' })
    }
  })

  // Scan books only
  fastify.post('/api/scan/books', async (request, reply) => {
    try {
      const booksPath = process.env.BOOKS_PATH || '/books'

      setProgressCallback(emitScanProgress)
      fastify.log.info('Starting books scan...')
      const result = await scanBooks(booksPath)
      fastify.log.info('Books scan completed')
      emitScanProgress({ type: 'complete', category: 'books' })

      return {
        success: true,
        added: result.added,
        updated: result.updated,
        errors: result.errors.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to scan books directory' })
    }
  })

  // Scan audiobooks only
  fastify.post('/api/scan/audiobooks', async (request, reply) => {
    try {
      const booksPath = process.env.BOOKS_PATH || '/books'
      const audiobooksPath = `${booksPath}/audiobooks`

      setProgressCallback(emitScanProgress)
      fastify.log.info('Starting audiobooks scan...')
      const result = await scanBooks(audiobooksPath, 'audiobook')
      fastify.log.info('Audiobooks scan completed')
      emitScanProgress({ type: 'complete', category: 'books' })

      return {
        success: true,
        added: result.added,
        updated: result.updated,
        errors: result.errors.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to scan audiobooks directory' })
    }
  })

  // Scan ebooks only
  fastify.post('/api/scan/ebooks', async (request, reply) => {
    try {
      const booksPath = process.env.BOOKS_PATH || '/books'
      const ebooksPath = `${booksPath}/ebooks`

      setProgressCallback(emitScanProgress)
      fastify.log.info('Starting ebooks scan...')
      const result = await scanBooks(ebooksPath, 'ebook')
      fastify.log.info('Ebooks scan completed')
      emitScanProgress({ type: 'complete', category: 'books' })

      return {
        success: true,
        added: result.added,
        updated: result.updated,
        errors: result.errors.length
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to scan ebooks directory' })
    }
  })

  // Clear metadata for movies
  fastify.post('/api/metadata/clear/movies', async (request, reply) => {
    try {
      fastify.log.info('Clearing movies metadata...')
      const db = getDatabase()
      const result = await db.db.execute("UPDATE media_items SET metadata_json = NULL WHERE type = 'movie'")
      const cleared = result.rowsAffected || 0
      fastify.log.info(`Movies metadata cleared: ${cleared} items`)

      return { success: true, cleared }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to clear movies metadata' })
    }
  })

  // Clear metadata for TV shows
  fastify.post('/api/metadata/clear/tv', async (request, reply) => {
    try {
      fastify.log.info('Clearing TV shows metadata...')
      const db = getDatabase()

      const episodesResult = await db.db.execute("UPDATE tv_episodes SET metadata_json = NULL")
      const episodesCleared = episodesResult.rowsAffected || 0
      fastify.log.info(`TV episodes metadata cleared: ${episodesCleared} items`)

      const result = await db.db.execute("UPDATE media_items SET metadata_json = NULL WHERE type = 'tv_show'")
      const cleared = result.rowsAffected || 0
      fastify.log.info(`TV shows metadata cleared: ${cleared} items`)

      return { success: true, cleared: cleared + episodesCleared }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to clear TV shows metadata' })
    }
  })

  // Clear metadata for books
  fastify.post('/api/metadata/clear/books', async (request, reply) => {
    try {
      fastify.log.info('Clearing books metadata...')
      const db = getDatabase()

      const result = await db.db.execute("UPDATE media_items SET metadata_json = NULL WHERE type IN ('audiobook', 'ebook')")
      const cleared = result.rowsAffected || 0
      fastify.log.info(`Books metadata cleared: ${cleared} items`)

      return { success: true, cleared }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to clear books metadata' })
    }
  })
}