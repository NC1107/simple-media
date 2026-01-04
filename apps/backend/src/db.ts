import { createClient } from '@libsql/client'

interface Database {
  db: any
}

export interface MediaItem {
  id?: number
  type: 'tv_show' | 'movie' | 'book'
  title: string
  path: string
  file_size?: number
  last_scanned: number
  metadata_json?: string
}

export interface TVEpisode {
  id?: number
  show_id: number
  season_number: number
  episode_number: number
  title: string
  file_path: string
  file_size: number
  last_scanned: number
}

let db: Database | null = null

export async function initDatabase(dbPath: string): Promise<Database> {
  const client = createClient({
    url: `file:${dbPath}`
  })
  
  const database: Database = { db: client }
  db = database
  
  // Create tables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS media_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      file_size INTEGER,
      last_scanned INTEGER NOT NULL,
      metadata_json TEXT
    )
  `)
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS tv_episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      season_number INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      file_size INTEGER NOT NULL,
      last_scanned INTEGER NOT NULL,
      FOREIGN KEY (show_id) REFERENCES media_items(id) ON DELETE CASCADE
    )
  `)
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  
  // Create indexes
  await client.execute('CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type)')
  await client.execute('CREATE INDEX IF NOT EXISTS idx_tv_episodes_show ON tv_episodes(show_id)')
  
  // Initialize default settings
  await client.execute(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('movies_metadata_enabled', 'false')
  `)
  await client.execute(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('tv_metadata_enabled', 'false')
  `)
  await client.execute(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('books_metadata_enabled', 'false')
  `)
  
  return database
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export async function insertMediaItem(item: MediaItem): Promise<number> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: `INSERT OR REPLACE INTO media_items (type, title, path, file_size, last_scanned, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [item.type, item.title, item.path, item.file_size || null, item.last_scanned, item.metadata_json || null]
  })
  return result.lastInsertRowid as number
}

export async function insertTVEpisode(episode: TVEpisode): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: `INSERT OR REPLACE INTO tv_episodes (show_id, season_number, episode_number, title, file_path, file_size, last_scanned)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [episode.show_id, episode.season_number, episode.episode_number, episode.title, episode.file_path, episode.file_size, episode.last_scanned]
  })
}

export async function getMediaItemsByType(type: string): Promise<MediaItem[]> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM media_items WHERE type = ? ORDER BY title',
    args: [type]
  })
  return result.rows as MediaItem[]
}

export async function getMediaItemByPath(path: string): Promise<MediaItem | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM media_items WHERE path = ?',
    args: [path]
  })
  return result.rows[0] as MediaItem || null
}

export async function getTVEpisodesByShow(showId: number): Promise<TVEpisode[]> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM tv_episodes WHERE show_id = ? ORDER BY season_number, episode_number',
    args: [showId]
  })
  return result.rows as TVEpisode[]
}

export async function getTVEpisodesBySeason(showId: number, seasonNumber: number): Promise<TVEpisode[]> {
  const database = getDatabase()
  const query = seasonNumber === 0
    ? 'SELECT * FROM tv_episodes WHERE show_id = ? ORDER BY season_number, episode_number'
    : 'SELECT * FROM tv_episodes WHERE show_id = ? AND season_number = ? ORDER BY episode_number'
  const args = seasonNumber === 0 ? [showId] : [showId, seasonNumber]
  
  const result = await database.db.execute({ sql: query, args })
  return result.rows as TVEpisode[]
}

export async function getMediaStats(): Promise<{ tvShows: number; movies: number; books: number }> {
  const database = getDatabase()
  const result = await database.db.execute('SELECT type, COUNT(*) as count FROM media_items GROUP BY type')
  const stats = result.rows as Array<{ type: string; count: number }>
  
  return {
    tvShows: stats.find(s => s.type === 'tv_show')?.count || 0,
    movies: stats.find(s => s.type === 'movie')?.count || 0,
    books: stats.find(s => s.type === 'book')?.count || 0
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT value FROM settings WHERE key = ?',
    args: [key]
  })
  return result.rows[0]?.value || null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    args: [key, value]
  })
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const database = getDatabase()
  const result = await database.db.execute('SELECT key, value FROM settings')
  const settings: Record<string, string> = {}
  for (const row of result.rows) {
    settings[row.key] = row.value
  }
  return settings
}