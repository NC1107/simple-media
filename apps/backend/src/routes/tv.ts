import { FastifyInstance } from 'fastify'
import path from 'path'
import { getMediaItemsByType, getMediaItemByIdOrPath, getTVEpisodesBySeason, insertMediaItem, insertTVEpisode } from '../db.js'

export async function tvRoutes(fastify: FastifyInstance) {
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

      const show = await getMediaItemByIdOrPath(showId)
      if (!show) {
        return { seasons: [], message: 'TV show not found' }
      }

      const tvPath = process.env.TV_SHOWS_PATH || '/tv'
      const episodes = await getTVEpisodesBySeason(show.id!, 0)

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

      const seasonMatch = seasonId.match(/(\d+)/)
      const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : 0

      const show = await getMediaItemByIdOrPath(showId)
      if (!show) {
        return { episodes: [], message: 'TV show not found' }
      }

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

      const { searchTVShow, parseTVShowTitle } = await import('../tvdb.js')
      const { saveTVShowPoster } = await import('../imageDownloader.js')
      const { title: cleanTitle, year } = parseTVShowTitle(show.title)
      fastify.log.info(`Parsed TV show title: "${cleanTitle}", year: ${year}`)

      const metadata = await searchTVShow(cleanTitle, year)
      if (!metadata) {
        fastify.log.warn(`No TVDB metadata found for: ${show.title}`)
        return reply.status(404).send({ error: 'Metadata not found' })
      }

      if (metadata.poster_url) {
        const showPath = path.join(process.env.TV_SHOWS_PATH || '/tv', showId)
        const savedPosterPath = await saveTVShowPoster(metadata.poster_url, showPath)
        if (savedPosterPath !== metadata.poster_url) {
          metadata.poster_url = savedPosterPath
        }
      }

      const metadataJson = JSON.stringify(metadata)

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

      const show = await getMediaItemByIdOrPath(showId)
      fastify.log.info(`Show lookup result for ${showId}: ${show ? `Found: ${show.title} (ID: ${show.id})` : 'Not found'}`)
      if (!show) {
        fastify.log.warn(`Show not found with ID: ${showId}`)
        return reply.status(404).send({ error: 'Show not found' })
      }

      fastify.log.info(`Show metadata_json: ${show.metadata_json ? 'Present' : 'Missing'}`)
      if (!show.metadata_json) {
        fastify.log.warn(`Show ${showId} (${show.title}) has no metadata. Please fetch show metadata first.`)
        return reply.status(404).send({ error: 'Show metadata not found. Please fetch show metadata first.' })
      }

      const showMetadata = JSON.parse(show.metadata_json)
      const seriesId = showMetadata.tvdb_id

      fastify.log.info(`Parsed show metadata - TVDB ID: ${seriesId}`)
      if (!seriesId) {
        fastify.log.warn(`No TVDB series ID found in show metadata`)
        return reply.status(404).send({ error: 'TVDB series ID not found in show metadata' })
      }

      const seasonNumber = parseInt(seasonId)
      const epNumber = parseInt(episodeNumber)
      fastify.log.info(`Looking for episode: show_id=${show.id}, season=${seasonNumber}, episode=${epNumber}`)
      const episodes = await getTVEpisodesBySeason(show.id!, seasonNumber)
      fastify.log.info(`Found ${episodes.length} episodes in season ${seasonNumber}`)
      const episode = episodes.find(ep => ep.episode_number === epNumber)

      if (!episode) {
        fastify.log.warn(`Episode not found: S${seasonNumber}E${epNumber}`)
        return reply.status(404).send({ error: 'Episode not found' })
      }

      const { getEpisodeMetadata } = await import('../tvdb.js')
      const { saveEpisodeThumb } = await import('../imageDownloader.js')
      const metadata = await getEpisodeMetadata(seriesId, seasonNumber, epNumber)

      if (!metadata) {
        fastify.log.warn(`No TVDB metadata found for episode`)
        return reply.status(404).send({ error: 'Episode metadata not found' })
      }

      if (metadata.still_url) {
        const episodePathParts = episode.file_path.split(/[\/\\]/)
        const seasonFolder = episodePathParts[episodePathParts.length - 2]
        const seasonPath = path.join(process.env.TV_SHOWS_PATH || '/tv', show.path, seasonFolder)
        const savedThumbPath = await saveEpisodeThumb(metadata.still_url, seasonPath, epNumber)
        if (savedThumbPath !== metadata.still_url) {
          metadata.still_url = savedThumbPath
        }
      }

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

  // Clear metadata for a specific TV show and its episodes
  fastify.post('/api/tv-shows/:showId/metadata/clear', async (request, reply) => {
    try {
      const { showId } = request.params as { showId: string }
      fastify.log.info(`Clearing metadata for show ${showId}...`)

      const show = await getMediaItemByIdOrPath(showId)
      if (!show) {
        return reply.status(404).send({ error: 'Show not found' })
      }

      const { getDatabase } = await import('../db.js')
      const db = getDatabase()

      const episodesResult = await db.db.execute({
        sql: "UPDATE tv_episodes SET metadata_json = NULL WHERE show_id = ?",
        args: [show.id!]
      })
      const episodesCleared = episodesResult.rowsAffected || 0
      fastify.log.info(`Episodes metadata cleared: ${episodesCleared} items`)

      const result = await db.db.execute({
        sql: "UPDATE media_items SET metadata_json = NULL WHERE id = ?",
        args: [show.id!]
      })
      const cleared = result.rowsAffected || 0
      fastify.log.info(`Show metadata cleared`)

      return { success: true, cleared: cleared + episodesCleared }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to clear show metadata' })
    }
  })
}