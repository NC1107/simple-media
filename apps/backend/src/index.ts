import Fastify from 'fastify'
import cors from '@fastify/cors'
import path from 'path'
import fs from 'fs/promises'
import { initDatabase, getMediaItemsByType, getMediaItemByPath, getMediaItemByIdOrPath, getTVEpisodesBySeason, getMediaStats, getAllSettings, setSetting, getSetting, getDatabase, cleanupInvalidSettings } from './db.js'
import { scanAllMedia, scanMovies, scanTVShows, scanBooks } from './scanner.js'
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

// Serve local images
fastify.get('/api/images/:mediaType/:itemPath/*', async (request, reply) => {
  try {
    const { mediaType, itemPath } = request.params as { mediaType: string, itemPath: string }
    const imagePath = (request.params as any)['*']
    
    let basePath = ''
    if (mediaType === 'tv') {
      basePath = process.env.TV_PATH || '/tv'
    } else if (mediaType === 'movies') {
      basePath = process.env.MOVIES_PATH || '/movies'
    } else if (mediaType === 'books') {
      basePath = process.env.BOOKS_PATH || '/books'
    } else {
      return reply.status(400).send({ error: 'Invalid media type' })
    }
    
    const fullPath = path.join(basePath, itemPath, imagePath)
    
    // Check if file exists and is actually an image
    try {
      await fs.access(fullPath)
      const ext = path.extname(fullPath).toLowerCase()
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        return reply.status(400).send({ error: 'Not an image file' })
      }
      
      // Set appropriate content type
      const contentType = ext === '.png' ? 'image/png' : 
                         ext === '.webp' ? 'image/webp' :
                         ext === '.gif' ? 'image/gif' : 'image/jpeg'
      
      reply.header('Content-Type', contentType)
      const fileStream = await fs.readFile(fullPath)
      return reply.send(fileStream)
    } catch (err) {
      return reply.status(404).send({ error: 'Image not found' })
    }
  } catch (error) {
    fastify.log.error(error, 'Failed to serve image')
    return reply.status(500).send({ error: 'Failed to serve image' })
  }
})

// Get TV shows from media directory
fastify.get('/api/tv-shows', async (request, reply) => {
  try {
    const shows = await getMediaItemsByType('tv_show')
    
    return { 
      shows: shows.map(show => ({
        id: show.id!.toString(),
        name: show.title,
        path: show.path,
        metadata_json: show.metadata_json
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
    
    // Get the show from database by ID or path
    const show = await getMediaItemByIdOrPath(showId)
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
    const show = await getMediaItemByIdOrPath(showId)
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
        fileSize: ep.file_size,
        metadata_json: ep.metadata_json
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
        id: movie.id!.toString(),
        name: movie.title,
        path: movie.path,
        fileSize: movie.file_size,
        metadata: movie.metadata_json ? JSON.parse(movie.metadata_json) : null
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
        id: book.id!.toString(),
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

// Test TMDB/TVDB API connections
fastify.get('/api/test-api-connections', async (request, reply) => {
  try {
    const { testTMDBConnection } = await import('./tmdb.js')
    const { testTVDBConnection } = await import('./tvdb.js')
    
    const [tmdbResult, tvdbResult] = await Promise.all([
      testTMDBConnection(),
      testTVDBConnection()
    ])
    
    return {
      tmdb: tmdbResult,
      tvdb: tvdbResult
    }
  } catch (error) {
    fastify.log.error(error, 'Failed to test API connections')
    return reply.status(500).send({ error: 'Failed to test connections' })
  }
})

// Fetch metadata for a single movie
fastify.post('/api/movies/:movieId/metadata', async (request, reply) => {
  try {
    const { movieId } = request.params as { movieId: string }
    
    fastify.log.info(`Fetching metadata for movie: ${movieId}`)
    
    const movie = await getMediaItemByIdOrPath(movieId)
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

// Fetch metadata for a specific TV show
fastify.post('/api/tv-shows/:showId/metadata', async (request, reply) => {
  try {
    const { showId } = request.params as { showId: string }
    
    fastify.log.info(`Fetching metadata for TV show: ${showId}`)
    
    const show = await getMediaItemByIdOrPath(showId)
    if (!show) {
      fastify.log.warn(`TV show not found: ${showId}`)
      return reply.status(404).send({ error: 'TV show not found' })
    }
    
    const { searchTVShow, parseTVShowTitle } = await import('./tvdb.js')
    const { saveTVShowPoster } = await import('./imageDownloader.js')
    const { title: cleanTitle, year } = parseTVShowTitle(show.title)
    fastify.log.info(`Parsed TV show title: "${cleanTitle}", year: ${year}`)
    
    const metadata = await searchTVShow(cleanTitle, year)
    if (!metadata) {
      fastify.log.warn(`No TVDB metadata found for: ${show.title}`)
      return reply.status(404).send({ error: 'Metadata not found' })
    }
    
    // Save poster locally if enabled
    if (metadata.poster_url) {
      const showPath = path.join(process.env.TV_PATH || '/tv', showId)
      const savedPosterPath = await saveTVShowPoster(metadata.poster_url, showPath)
      if (savedPosterPath !== metadata.poster_url) {
        metadata.poster_url = savedPosterPath
      }
    }
    
    const metadataJson = JSON.stringify(metadata)
    
    // Update the media item with metadata
    const { insertMediaItem } = await import('./db.js')
    await insertMediaItem({
      ...show,
      metadata_json: metadataJson
    })
    
    fastify.log.info(`Metadata fetched and saved for: ${metadata.title}`)
    
    return { success: true, metadata }
  } catch (error) {
    fastify.log.error(error, 'Failed to fetch TV show metadata')
    return reply.status(500).send({ error: 'Failed to fetch metadata' })
  }
})

// Fetch metadata for a specific episode
fastify.post('/api/tv-shows/:showId/seasons/:seasonId/episodes/:episodeNumber/metadata', async (request, reply) => {
  try {
    const { showId, seasonId, episodeNumber } = request.params as { showId: string, seasonId: string, episodeNumber: string }
    
    fastify.log.info(`Fetching episode metadata for ${showId} S${seasonId}E${episodeNumber}`)
    
    // Get the show to retrieve its TVDB ID
    const show = await getMediaItemByIdOrPath(showId)
    if (!show || !show.metadata_json) {
      fastify.log.warn(`Show not found or missing metadata: ${showId}`)
      return reply.status(404).send({ error: 'Show metadata not found. Please fetch show metadata first.' })
    }
    
    const showMetadata = JSON.parse(show.metadata_json)
    const seriesId = showMetadata.tvdb_id
    
    if (!seriesId) {
      return reply.status(404).send({ error: 'TVDB series ID not found in show metadata' })
    }
    
    // Get episode from database by season and episode number
    const seasonNumber = parseInt(seasonId)
    const epNumber = parseInt(episodeNumber)
    const episodes = await getTVEpisodesBySeason(show.id!, seasonNumber)
    const episode = episodes.find(ep => ep.episode_number === epNumber)
    
    if (!episode) {
      return reply.status(404).send({ error: 'Episode not found' })
    }
    
    // Fetch episode metadata from TVDB
    const { getEpisodeMetadata } = await import('./tvdb.js')
    const { saveEpisodeThumb } = await import('./imageDownloader.js')
    const metadata = await getEpisodeMetadata(seriesId, seasonNumber, epNumber)
    
    if (!metadata) {
      fastify.log.warn(`No TVDB metadata found for episode`)
      return reply.status(404).send({ error: 'Episode metadata not found' })
    }
    
    // Save thumbnail locally if enabled
    if (metadata.still_url) {
      const episodePathParts = episode.file_path.split(path.sep)
      const seasonFolder = episodePathParts[episodePathParts.length - 2]
      const seasonPath = path.join(process.env.TV_PATH || '/tv', showId, seasonFolder)
      const savedThumbPath = await saveEpisodeThumb(metadata.still_url, seasonPath, epNumber)
      if (savedThumbPath !== metadata.still_url) {
        metadata.still_url = savedThumbPath
      }
    }
    
    // Update episode with metadata
    const { insertTVEpisode } = await import('./db.js')
    await insertTVEpisode({
      ...episode,
      metadata_json: JSON.stringify(metadata)
    })
    
    fastify.log.info(`Episode metadata fetched and saved: ${metadata.name}`)
    
    return { success: true, metadata }
  } catch (error) {
    fastify.log.error(error, 'Failed to fetch episode metadata')
    return reply.status(500).send({ error: 'Failed to fetch episode metadata' })
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

// Scan movies only
fastify.post('/api/scan/movies', async (request, reply) => {
  try {
    const moviesPath = process.env.MOVIES_PATH || '/movies'
    
    fastify.log.info('Starting movies scan...')
    const result = await scanMovies(moviesPath, false)
    fastify.log.info('Movies scan completed')
    
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
    
    fastify.log.info('Starting TV shows scan...')
    const result = await scanTVShows(tvPath)
    fastify.log.info('TV shows scan completed')
    
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
    
    fastify.log.info('Starting books scan...')
    const result = await scanBooks(booksPath)
    fastify.log.info('Books scan completed')
    
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
    const result = await db.db.execute("UPDATE media_items SET metadata_json = NULL WHERE type = 'tv_show'")
    const cleared = result.rowsAffected || 0
    fastify.log.info(`TV shows metadata cleared: ${cleared} items`)
    
    return { success: true, cleared }
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
    const result = await db.db.execute("UPDATE media_items SET metadata_json = NULL WHERE type = 'book'")
    const cleared = result.rowsAffected || 0
    fastify.log.info(`Books metadata cleared: ${cleared} items`)
    
    return { success: true, cleared }
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to clear books metadata' })
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
    
    // Clean up invalid settings (metadata stored in wrong table)
    const cleaned = await cleanupInvalidSettings()
    if (cleaned > 0) {
      fastify.log.info(`Cleaned up ${cleaned} invalid settings`)
    }
    
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
