import Fastify from 'fastify'
import cors from '@fastify/cors'
import path from 'path'
import { initDatabase, getMediaItemsByType, getMediaItemByPath, getTVEpisodesBySeason, getMediaStats, getAllSettings, setSetting, getSetting } from './db.js'
import { scanAllMedia } from './scanner.js'
import { searchMovie, parseMovieTitle } from './tmdb.js'

const fastify = Fastify({
  logger: true
})

// Enable CORS for frontend - allow all origins in development/production
await fastify.register(cors, {
  origin: true // Allow all origins, or use environment variable for specific origins
})

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', service: 'simple-media-backend' }
})

// Get TV shows from media directory
fastify.get('/api/tv-shows', async (request, reply) => {
  try {
    const shows = await getMediaItemsByType('tv_show')
    
    return { 
      shows: shows.map(show => ({
        id: show.path,
        name: show.title,
        path: show.path
      })),
      total: shows.length 
    }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read TV shows' })
  }
})

// Get seasons for a specific TV show
fastify.get('/api/tv-shows/:showId/seasons', async (request, reply) => {
  try {
    const { showId } = request.params as { showId: string }
    
    // Get the show from database
    const show = await getMediaItemByPath(showId)
    if (!show) {
      return { seasons: [], message: 'TV show not found' }
    }
    
    // Get all episodes for this show and extract unique seasons
    const tvPath = process.env.TV_SHOWS_PATH || '/tv'
    const episodes = await getTVEpisodesBySeason(show.id!, 0) // Get all episodes
    
    // Group by season number
    const seasonMap = new Map<number, any>()
    for (const episode of episodes) {
      if (!seasonMap.has(episode.season_number)) {
        seasonMap.set(episode.season_number, {
          id: `Season ${episode.season_number}`,
          name: `Season ${episode.season_number}`,
          seasonNumber: episode.season_number,
          path: path.join(tvPath, showId, `Season ${episode.season_number}`)
        })
      }
    }
    
    const seasons = Array.from(seasonMap.values()).sort((a, b) => a.seasonNumber - b.seasonNumber)
    
    return { seasons, total: seasons.length }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read seasons' })
  }
})

// Get episodes for a specific season
fastify.get('/api/tv-shows/:showId/seasons/:seasonId/episodes', async (request, reply) => {
  try {
    const { showId, seasonId } = request.params as { showId: string, seasonId: string }
    
    // Parse season number from seasonId (e.g., "Season 1" -> 1)
    const seasonMatch = seasonId.match(/(\d+)/)
    const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : 0
    
    // Get the show from database
    const show = await getMediaItemByPath(showId)
    if (!show) {
      return { episodes: [], message: 'TV show not found' }
    }
    
    // Get episodes for this season
    const episodes = await getTVEpisodesBySeason(show.id!, seasonNumber)
    
    return { 
      episodes: episodes.map(ep => ({
        id: ep.file_path,
        name: ep.title,
        episodeNumber: ep.episode_number,
        path: ep.file_path,
        fileSize: ep.file_size
      })),
      total: episodes.length 
    }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read episodes' })
  }
})

// Get movies from media directory
fastify.get('/api/movies', async (request, reply) => {
  try {
    const movies = await getMediaItemsByType('movie')
    
    return { 
      movies: movies.map(movie => ({
        id: movie.path,
        name: movie.title,
        path: movie.path,
        fileSize: movie.file_size
      })),
      total: movies.length 
    }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to read movies' })
  }
})

// Get books from media directory
fastify.get('/api/books', async (request, reply) => {
  try {
    const books = await getMediaItemsByType('book')
    
    return { 
      books: books.map(book => ({
        id: book.path,
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

// Settings endpoints
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

// Fetch metadata for a single movie
fastify.post('/api/movies/:movieId/metadata', async (request, reply) => {
  try {
    const { movieId } = request.params as { movieId: string }
    
    fastify.log.info(`Fetching metadata for movie: ${movieId}`)
    
    const movie = await getMediaItemByPath(movieId)
    if (!movie) {
      fastify.log.warn(`Movie not found: ${movieId}`)
      return reply.status(404).send({ error: 'Movie not found' })
    }
    
    const { title: cleanTitle, year } = parseMovieTitle(movie.title)
    fastify.log.info(`Parsed movie title: "${cleanTitle}", year: ${year}`)
    
    const metadata = await searchMovie(cleanTitle, year)
    if (!metadata) {
      fastify.log.warn(`No TMDB metadata found for: ${movie.title}`)
      return reply.status(404).send({ error: 'Metadata not found' })
    }
    
    const metadataJson = JSON.stringify(metadata)
    movie.metadata_json = metadataJson
    
    await setSetting(`movie_metadata_${movieId}`, metadataJson)
    
    // Update the media item with metadata
    const { insertMediaItem } = await import('./db.js')
    await insertMediaItem({
      ...movie,
      metadata_json: metadataJson
    })
    
    fastify.log.info(`Metadata fetched and saved for: ${metadata.title}`)
    
    return { success: true, metadata }
  } catch (error) {
    fastify.log.error(error, 'Failed to fetch movie metadata')
    return reply.status(500).send({ error: 'Failed to fetch metadata' })
  }
})

// Basic API endpoint
fastify.get('/api/media', async (request, reply) => {
  return { 
    message: 'Media endpoint working',
    items: [] 
  }
})

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
    const results = await scanAllMedia(tvPath, moviesPath, booksPath, false)  // Allow metadata on manual scan
    fastify.log.info('Media scan completed')
    
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
    return reply.status(500).send({ error: 'Failed to scan media directories' })
  }
})

// Debug endpoint - Get raw database entries with metadata
fastify.get('/api/debug/database', async (request, reply) => {
  try {
    const tvShows = await getMediaItemsByType('tv_show')
    const movies = await getMediaItemsByType('movie')
    const books = await getMediaItemsByType('book')
    
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

const start = async () => {
  try {
    // Initialize database
    const dbPath = process.env.DB_PATH || './data/media.sqlite'
    fastify.log.info(`Initializing database at ${dbPath}`)
    await initDatabase(dbPath)
    fastify.log.info('Database initialized successfully')
    
    // Start server first, then optionally perform initial scan in background
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
    fastify.log.info('Server running on http://localhost:3001')
    
    // Perform initial scan in background (non-blocking)
    if (process.env.SKIP_INITIAL_SCAN !== 'true') {
      const tvPath = process.env.TV_SHOWS_PATH || '/tv'
      const moviesPath = process.env.MOVIES_PATH || '/movies'
      const booksPath = process.env.BOOKS_PATH || '/books'
      
      fastify.log.info('Performing initial media scan in background (no metadata)...')
      scanAllMedia(tvPath, moviesPath, booksPath, true)  // skipMetadata=true
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