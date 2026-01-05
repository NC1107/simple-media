import { FastifyInstance } from 'fastify'
import { tvRoutes } from './tv.js'
import { movieRoutes } from './movies.js'
import { bookRoutes } from './books.js'
import { scanRoutes } from './scan.js'
import { settingsRoutes } from './settings.js'
import { imageRoutes } from './images.js'
import { debugRoutes } from './debug.js'

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(tvRoutes)
  await fastify.register(movieRoutes)
  await fastify.register(bookRoutes)
  await fastify.register(scanRoutes)
  await fastify.register(settingsRoutes)
  await fastify.register(imageRoutes)
  await fastify.register(debugRoutes)
}

export { emitScanProgress } from './scan.js'
