import { FastifyInstance } from 'fastify'
import path from 'path'
import fs from 'fs/promises'

export async function imageRoutes(fastify: FastifyInstance) {
  // Serve local images
  fastify.get('/api/images/:mediaType/:itemPath/*', async (request, reply) => {
    try {
      const { mediaType, itemPath } = request.params as { mediaType: string, itemPath: string }
      const imagePath = (request.params as any)['*']

      let basePath = ''
      if (mediaType === 'tv') {
        basePath = process.env.TV_SHOWS_PATH || '/tv'
      } else if (mediaType === 'movies') {
        basePath = process.env.MOVIES_PATH || '/movies'
      } else if (mediaType === 'books') {
        basePath = process.env.BOOKS_PATH || '/books'
      } else {
        return reply.status(400).send({ error: 'Invalid media type' })
      }

      const fullPath = path.join(basePath, itemPath, imagePath)

      try {
        await fs.access(fullPath)
        const ext = path.extname(fullPath).toLowerCase()
        if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
          return reply.status(400).send({ error: 'Not an image file' })
        }

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
}