import { createClient } from '@libsql/client'
import type { MediaItem, TVEpisode, Author, BookSeries, Book } from './types.js'

// Re-export types for use by other modules
export type { MediaItem, TVEpisode, Author, BookSeries, Book }

interface Database {
  db: any
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
      metadata_json TEXT,
      FOREIGN KEY (show_id) REFERENCES media_items(id) ON DELETE CASCADE
    )
  `)
  
  // Migration: Add metadata_json column if it doesn't exist
  try {
    await client.execute(`ALTER TABLE tv_episodes ADD COLUMN metadata_json TEXT`)
  } catch (e) {
    // Column already exists, ignore error
  }
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  // Create books hierarchy tables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      metadata_json TEXT,
      created_at INTEGER NOT NULL,
      last_scanned INTEGER NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS book_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL,
      last_scanned INTEGER NOT NULL,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
      UNIQUE(author_id, name)
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      file_size INTEGER,
      last_scanned INTEGER NOT NULL,
      metadata_json TEXT,
      FOREIGN KEY (series_id) REFERENCES book_series(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    )
  `)

  // Create indexes
  await client.execute('CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type)')
  await client.execute('CREATE INDEX IF NOT EXISTS idx_tv_episodes_show ON tv_episodes(show_id)')
  await client.execute('CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name)')
  await client.execute('CREATE INDEX IF NOT EXISTS idx_series_author ON book_series(author_id)')
  await client.execute('CREATE INDEX IF NOT EXISTS idx_books_series ON books(series_id)')
  await client.execute('CREATE INDEX IF NOT EXISTS idx_books_author ON books(author_id)')
  await client.execute('CREATE INDEX IF NOT EXISTS idx_books_type ON books(type)')
  
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
  
  // Check if item already exists by path
  const existing = await getMediaItemByPath(item.path)
  
  if (existing) {
    // Update existing item, preserving the ID
    // Only update metadata_json if a new value is provided
    if (item.metadata_json !== undefined) {
      await database.db.execute({
        sql: `UPDATE media_items SET type = ?, title = ?, file_size = ?, last_scanned = ?, metadata_json = ?
              WHERE id = ?`,
        args: [item.type, item.title, item.file_size || null, item.last_scanned, item.metadata_json, existing.id]
      })
    } else {
      // Don't update metadata_json, preserve existing
      await database.db.execute({
        sql: `UPDATE media_items SET type = ?, title = ?, file_size = ?, last_scanned = ?
              WHERE id = ?`,
        args: [item.type, item.title, item.file_size || null, item.last_scanned, existing.id]
      })
    }
    return existing.id as number
  } else {
    // Insert new item
    const result = await database.db.execute({
      sql: `INSERT INTO media_items (type, title, path, file_size, last_scanned, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [item.type, item.title, item.path, item.file_size || null, item.last_scanned, item.metadata_json || null]
    })
    return result.lastInsertRowid as number
  }
}

export async function insertTVEpisode(episode: TVEpisode): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: `INSERT OR REPLACE INTO tv_episodes (show_id, season_number, episode_number, title, file_path, file_size, last_scanned, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [episode.show_id, episode.season_number, episode.episode_number, episode.title, episode.file_path, episode.file_size, episode.last_scanned, episode.metadata_json || null]
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

export async function getMediaItemById(id: number): Promise<MediaItem | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM media_items WHERE id = ?',
    args: [id]
  })
  return result.rows[0] as MediaItem || null
}

export async function getMediaItemByIdOrPath(idOrPath: string): Promise<MediaItem | null> {
  // Try as ID first (numeric)
  const numericId = parseInt(idOrPath)
  if (!isNaN(numericId)) {
    const byId = await getMediaItemById(numericId)
    if (byId) return byId
  }
  
  // Fall back to path lookup for backwards compatibility
  return await getMediaItemByPath(idOrPath)
}

export async function deleteMediaItem(id: number): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'DELETE FROM media_items WHERE id = ?',
    args: [id]
  })
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
  
  // Books are stored as 'audiobook' or 'ebook' types
  const audiobookCount = stats.find(s => s.type === 'audiobook')?.count || 0
  const ebookCount = stats.find(s => s.type === 'ebook')?.count || 0
  
  return {
    tvShows: stats.find(s => s.type === 'tv_show')?.count || 0,
    movies: stats.find(s => s.type === 'movie')?.count || 0,
    books: audiobookCount + ebookCount
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

export async function cleanupInvalidSettings(): Promise<number> {
  const database = getDatabase()
  // Remove any settings that start with "movie_metadata_", "tv_metadata_", or "book_metadata_"
  // These should be in media_items table, not settings
  const result = await database.db.execute({
    sql: "DELETE FROM settings WHERE key LIKE 'movie_metadata_%' OR key LIKE 'tv_metadata_%' OR key LIKE 'book_metadata_%'",
    args: []
  })
  return result.rowsAffected || 0
}

// =============================================================================
// Authors CRUD functions
// =============================================================================

export async function insertAuthor(author: Author): Promise<number> {
  const database = getDatabase()

  const existing = await getAuthorByName(author.name)

  if (existing) {
    await database.db.execute({
      sql: `UPDATE authors SET last_scanned = ?, metadata_json = ?
            WHERE id = ?`,
      args: [author.last_scanned, author.metadata_json || null, existing.id]
    })
    return existing.id as number
  } else {
    const result = await database.db.execute({
      sql: `INSERT INTO authors (name, metadata_json, created_at, last_scanned)
            VALUES (?, ?, ?, ?)`,
      args: [author.name, author.metadata_json || null, author.created_at, author.last_scanned]
    })
    return result.lastInsertRowid as number
  }
}

export async function getAuthorByName(name: string): Promise<Author | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM authors WHERE name = ?',
    args: [name]
  })
  return result.rows[0] as Author || null
}

export async function getAuthorById(id: number): Promise<Author | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM authors WHERE id = ?',
    args: [id]
  })
  return result.rows[0] as Author || null
}

export async function updateAuthorMetadata(id: number, metadataJson: string | null): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'UPDATE authors SET metadata_json = ?, last_scanned = ? WHERE id = ?',
    args: [metadataJson, Date.now(), id]
  })
}

export async function getAllAuthors(): Promise<Author[]> {
  const database = getDatabase()
  const result = await database.db.execute('SELECT * FROM authors ORDER BY name')
  return result.rows as Author[]
}

export async function updateAuthorLastScanned(id: number, timestamp: number): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'UPDATE authors SET last_scanned = ? WHERE id = ?',
    args: [timestamp, id]
  })
}

export async function deleteAuthor(id: number): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'DELETE FROM authors WHERE id = ?',
    args: [id]
  })
}

// =============================================================================
// Book Series CRUD functions
// =============================================================================

export async function insertSeries(series: BookSeries): Promise<number> {
  const database = getDatabase()

  const existing = await getSeriesByAuthorAndName(series.author_id, series.name)

  if (existing) {
    await database.db.execute({
      sql: `UPDATE book_series SET last_scanned = ?, metadata_json = ?
            WHERE id = ?`,
      args: [series.last_scanned, series.metadata_json || null, existing.id]
    })
    return existing.id as number
  } else {
    const result = await database.db.execute({
      sql: `INSERT INTO book_series (author_id, name, metadata_json, created_at, last_scanned)
            VALUES (?, ?, ?, ?, ?)`,
      args: [series.author_id, series.name, series.metadata_json || null, series.created_at, series.last_scanned]
    })
    return result.lastInsertRowid as number
  }
}

export async function getSeriesByAuthorAndName(authorId: number, name: string): Promise<BookSeries | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM book_series WHERE author_id = ? AND name = ?',
    args: [authorId, name]
  })
  return result.rows[0] as BookSeries || null
}

export async function getSeriesById(id: number): Promise<BookSeries | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM book_series WHERE id = ?',
    args: [id]
  })
  return result.rows[0] as BookSeries || null
}

export async function getSeriesByAuthor(authorId: number): Promise<BookSeries[]> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM book_series WHERE author_id = ? ORDER BY name',
    args: [authorId]
  })
  return result.rows as BookSeries[]
}

export async function updateSeriesLastScanned(id: number, timestamp: number): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'UPDATE book_series SET last_scanned = ? WHERE id = ?',
    args: [timestamp, id]
  })
}

export async function deleteSeries(id: number): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'DELETE FROM book_series WHERE id = ?',
    args: [id]
  })
}

// =============================================================================
// Books CRUD functions
// =============================================================================

export async function insertBook(book: Book): Promise<number> {
  const database = getDatabase()

  const existing = await getBookByPath(book.path)

  if (existing) {
    if (book.metadata_json !== undefined) {
      await database.db.execute({
        sql: `UPDATE books SET series_id = ?, author_id = ?, title = ?, type = ?,
              file_size = ?, last_scanned = ?, metadata_json = ?
              WHERE id = ?`,
        args: [book.series_id || null, book.author_id, book.title, book.type,
               book.file_size || null, book.last_scanned, book.metadata_json, existing.id]
      })
    } else {
      await database.db.execute({
        sql: `UPDATE books SET series_id = ?, author_id = ?, title = ?, type = ?,
              file_size = ?, last_scanned = ?
              WHERE id = ?`,
        args: [book.series_id || null, book.author_id, book.title, book.type,
               book.file_size || null, book.last_scanned, existing.id]
      })
    }
    return existing.id as number
  } else {
    const result = await database.db.execute({
      sql: `INSERT INTO books (series_id, author_id, title, type, path, file_size, last_scanned, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [book.series_id || null, book.author_id, book.title, book.type, book.path,
             book.file_size || null, book.last_scanned, book.metadata_json || null]
    })
    return result.lastInsertRowid as number
  }
}

export async function getBookByPath(path: string): Promise<Book | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM books WHERE path = ?',
    args: [path]
  })
  return result.rows[0] as Book || null
}

export async function getBookById(id: number): Promise<Book | null> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM books WHERE id = ?',
    args: [id]
  })
  return result.rows[0] as Book || null
}

export async function getBooksBySeriesId(seriesId: number): Promise<Book[]> {
  const database = getDatabase()
  const result = await database.db.execute({
    sql: 'SELECT * FROM books WHERE series_id = ? ORDER BY title',
    args: [seriesId]
  })
  return result.rows as Book[]
}

export async function getBooksByAuthorId(authorId: number, standaloneOnly: boolean = false): Promise<Book[]> {
  const database = getDatabase()
  const sql = standaloneOnly
    ? 'SELECT * FROM books WHERE author_id = ? AND series_id IS NULL ORDER BY title'
    : 'SELECT * FROM books WHERE author_id = ? ORDER BY title'
  const result = await database.db.execute({
    sql,
    args: [authorId]
  })
  return result.rows as Book[]
}

export async function getBooksByAuthorIdAndType(
  authorId: number,
  type: 'audiobook' | 'ebook',
  standaloneOnly: boolean = false
): Promise<Book[]> {
  const database = getDatabase()

  let sql = 'SELECT * FROM books WHERE author_id = ? AND type = ?'
  const args: any[] = [authorId, type]

  if (standaloneOnly) {
    sql += ' AND series_id IS NULL'
  }

  sql += ' ORDER BY title'

  const result = await database.db.execute({
    sql,
    args
  })

  return result.rows as Book[]
}

export async function getAllBooks(): Promise<Book[]> {
  const database = getDatabase()
  const result = await database.db.execute('SELECT * FROM books ORDER BY title')
  return result.rows as Book[]
}

export async function updateBook(book: Book): Promise<void> {
  const database = getDatabase()
  if (book.metadata_json !== undefined) {
    await database.db.execute({
      sql: `UPDATE books SET series_id = ?, author_id = ?, title = ?, type = ?,
            file_size = ?, last_scanned = ?, metadata_json = ?
            WHERE id = ?`,
      args: [book.series_id || null, book.author_id, book.title, book.type,
             book.file_size || null, book.last_scanned, book.metadata_json, book.id]
    })
  } else {
    await database.db.execute({
      sql: `UPDATE books SET series_id = ?, author_id = ?, title = ?, type = ?,
            file_size = ?, last_scanned = ?
            WHERE id = ?`,
      args: [book.series_id || null, book.author_id, book.title, book.type,
             book.file_size || null, book.last_scanned, book.id]
    })
  }
}

export async function deleteBook(id: number): Promise<void> {
  const database = getDatabase()
  await database.db.execute({
    sql: 'DELETE FROM books WHERE id = ?',
    args: [id]
  })
}

// =============================================================================
// Books hierarchy helper functions
// =============================================================================

export async function getAuthorWithCounts(authorId: number): Promise<{ author: Author; bookCount: number; seriesCount: number } | null> {
  const author = await getAuthorById(authorId)
  if (!author) return null

  const database = getDatabase()

  const bookCountResult = await database.db.execute({
    sql: 'SELECT COUNT(*) as count FROM books WHERE author_id = ?',
    args: [authorId]
  })
  const bookCount = bookCountResult.rows[0]?.count || 0

  const seriesCountResult = await database.db.execute({
    sql: 'SELECT COUNT(*) as count FROM book_series WHERE author_id = ?',
    args: [authorId]
  })
  const seriesCount = seriesCountResult.rows[0]?.count || 0

  return { author, bookCount, seriesCount }
}

export async function getAllAuthorsWithCounts(): Promise<Array<{ id: number; name: string; bookCount: number; seriesCount: number; metadata_json?: string | null }>> {
  const database = getDatabase()
  const result = await database.db.execute(`
    SELECT
      a.id,
      a.name,
      a.metadata_json,
      COUNT(DISTINCT b.id) as bookCount,
      COUNT(DISTINCT s.id) as seriesCount
    FROM authors a
    LEFT JOIN books b ON a.id = b.author_id
    LEFT JOIN book_series s ON a.id = s.author_id
    GROUP BY a.id, a.name
    ORDER BY a.name
  `)
  return result.rows as Array<{ id: number; name: string; bookCount: number; seriesCount: number }>
}

export async function getSeriesWithBookCount(seriesId: number): Promise<{ series: BookSeries; bookCount: number; authorName: string } | null> {
  const series = await getSeriesById(seriesId)
  if (!series) return null

  const author = await getAuthorById(series.author_id)
  if (!author) return null

  const database = getDatabase()
  const bookCountResult = await database.db.execute({
    sql: 'SELECT COUNT(*) as count FROM books WHERE series_id = ?',
    args: [seriesId]
  })
  const bookCount = bookCountResult.rows[0]?.count || 0

  return { series, bookCount, authorName: author.name }
}