import { FastifyInstance } from 'fastify'
import { getMediaItemsByType, getMediaItemByIdOrPath, insertMediaItem } from '../db.js'
import { searchMovie, parseMovieTitle } from '../tmdb.js'

export async function movieRoutes(fastify: FastifyInstance) {
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
}
