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

// Get seasons for a specific TV show
fastify.get('/api/tv-shows/:showId/seasons', async (request, reply) => {
  try {
    const { showId } = request.params as { showId: string }
    const tvPath = process.env.MEDIA_PATH || '/tv'
    const showPath = path.join(tvPath, showId)
    
    // Check if show directory exists
    try {
      await fs.access(showPath)
    } catch {
      return { seasons: [], message: 'TV show not found' }
    }

    // Read show directory contents
    const entries = await fs.readdir(showPath, { withFileTypes: true })
    
    // Filter for season directories
    const seasons = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => /season\s*\d+/i.test(entry.name))
      .map(entry => {
        const match = entry.name.match(/season\s*(\d+)/i)
        const seasonNumber = match ? parseInt(match[1]) : 0
        return {
          id: entry.name,
          name: entry.name,
          seasonNumber,
          path: path.join(showPath, entry.name)
        }
      })
      .sort((a, b) => a.seasonNumber - b.seasonNumber)

    return { seasons, total: seasons.length }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read seasons directory' })
  }
})

// Get episodes for a specific season
fastify.get('/api/tv-shows/:showId/seasons/:seasonId/episodes', async (request, reply) => {
  try {
    const { showId, seasonId } = request.params as { showId: string, seasonId: string }
    const tvPath = process.env.MEDIA_PATH || '/tv'
    const seasonPath = path.join(tvPath, showId, seasonId)
    
    // Check if season directory exists
    try {
      await fs.access(seasonPath)
    } catch {
      return { episodes: [], message: 'Season not found' }
    }

    // Read season directory contents
    const entries = await fs.readdir(seasonPath, { withFileTypes: true })
    
    // Filter for video files
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
    const episodes = entries
      .filter(entry => entry.isFile())
      .filter(entry => videoExtensions.some(ext => entry.name.toLowerCase().endsWith(ext)))
      .map(entry => {
        // Try to parse episode number from filename (e.g., S01E01, 1x01, etc.)
        const epMatch = entry.name.match(/[SE](\d+)[EX](\d+)/i) || entry.name.match(/(\d+)x(\d+)/i)
        const episodeNumber = epMatch ? parseInt(epMatch[2]) : 0
        
        // Get file stats
        const fullPath = path.join(seasonPath, entry.name)
        
        return {
          id: entry.name,
          name: entry.name,
          episodeNumber,
          path: fullPath,
          extension: path.extname(entry.name)
        }
      })
      .sort((a, b) => a.episodeNumber - b.episodeNumber || a.name.localeCompare(b.name))

    return { episodes, total: episodes.length }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read episodes directory' })
  }
})

// Get movies from media directory
fastify.get('/api/movies', async (request, reply) => {
  try {
    const moviesPath = process.env.MOVIES_PATH || '/movies'
    
    // Check if directory exists
    try {
      await fs.access(moviesPath)
    } catch {
      return { movies: [], message: 'Movies directory not configured or not accessible' }
    }

    // Read directory contents
    const entries = await fs.readdir(moviesPath, { withFileTypes: true })
    
    // Filter for directories only and map to movie objects
    const movies = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        id: entry.name,
        name: entry.name,
        path: path.join(moviesPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { movies, total: movies.length }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read movies directory' })
  }
})

// Get books from media directory
fastify.get('/api/books', async (request, reply) => {
  try {
    const booksPath = process.env.BOOKS_PATH || '/books'
    
    // Check if directory exists
    try {
      await fs.access(booksPath)
    } catch {
      return { books: [], message: 'Books directory not configured or not accessible' }
    }

    // Read directory contents
    const entries = await fs.readdir(booksPath, { withFileTypes: true })
    
    // Filter for directories only and map to book objects
    const books = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        id: entry.name,
        name: entry.name,
        path: path.join(booksPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { books, total: books.length }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read books directory' })
  }
})

// Dashboard stats endpoint
fastify.get('/api/stats', async (request, reply) => {
  try {
    const tvPath = process.env.MEDIA_PATH || '/tv'
    const moviesPath = process.env.MOVIES_PATH || '/movies'
    const booksPath = process.env.BOOKS_PATH || '/books'

    const stats = {
      tvShows: 0,
      movies: 0,
      books: 0
    }

    // Count TV shows
    try {
      await fs.access(tvPath)
      const tvEntries = await fs.readdir(tvPath, { withFileTypes: true })
      stats.tvShows = tvEntries.filter(e => e.isDirectory()).length
    } catch {}

    // Count movies
    try {
      await fs.access(moviesPath)
      const movieEntries = await fs.readdir(moviesPath, { withFileTypes: true })
      stats.movies = movieEntries.filter(e => e.isDirectory()).length
    } catch {}

    // Count books
    try {
      await fs.access(booksPath)
      const bookEntries = await fs.readdir(booksPath, { withFileTypes: true })
      stats.books = bookEntries.filter(e => e.isDirectory()).length
    } catch {}

    return stats
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to fetch stats' })
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