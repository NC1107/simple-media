import path from 'path'
import { getMediaItemsByType, deleteMediaItem, insertAuthor, insertSeries, insertBook } from './db.js'
import type { MediaItem } from './types.js'

export interface MigrationResult {
  success: boolean
  migratedCount: number
  errorCount: number
  errors: string[]
}

export async function migrateOldBooksToHierarchy(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    errorCount: 0,
    errors: []
  }

  const now = Date.now()

  try {
    console.log('Starting book migration from old structure to hierarchical structure...')

    // Get all books from media_items table
    const audiobooks = await getMediaItemsByType('audiobook')
    const ebooks = await getMediaItemsByType('ebook')
    const allOldBooks = [...audiobooks, ...ebooks]

    console.log(`Found ${allOldBooks.length} books to migrate`)

    for (const oldBook of allOldBooks) {
      try {
        // Parse path: {type}/Author/Series
        // Example: audiobooks/Brandon Sanderson/Mistborn
        const pathParts = oldBook.path.split(path.sep)

        if (pathParts.length < 3) {
          result.errors.push(`Invalid path structure for book: ${oldBook.path}`)
          result.errorCount++
          continue
        }

        const bookType = pathParts[0] as 'audiobook' | 'ebook'
        const authorName = pathParts[1]
        const seriesName = pathParts[2]

        // Create or get author
        const authorId = await insertAuthor({
          name: authorName,
          created_at: now,
          last_scanned: now
        })

        // Create or get series
        const seriesId = await insertSeries({
          author_id: authorId,
          name: seriesName,
          created_at: now,
          last_scanned: now
        })

        // Create book record (initially map old series → single book)
        // The old structure treated entire series directories as one item,
        // so we'll create one book per old series with the series name as the title
        await insertBook({
          series_id: seriesId,
          author_id: authorId,
          title: seriesName,
          type: bookType,
          path: oldBook.path,
          file_size: oldBook.file_size,
          last_scanned: now,
          metadata_json: oldBook.metadata_json
        })

        // Delete the old media_items entry
        if (oldBook.id) {
          await deleteMediaItem(oldBook.id)
        }

        result.migratedCount++
        console.log(`Migrated: ${authorName} - ${seriesName}`)
      } catch (error) {
        const errorMsg = `Failed to migrate book ${oldBook.path}: ${error}`
        console.error(errorMsg)
        result.errors.push(errorMsg)
        result.errorCount++
      }
    }

    if (result.errorCount > 0) {
      result.success = false
    }

    console.log(`Migration complete: ${result.migratedCount} migrated, ${result.errorCount} errors`)

    return result
  } catch (error) {
    console.error('Migration failed:', error)
    return {
      success: false,
      migratedCount: result.migratedCount,
      errorCount: result.errorCount + 1,
      errors: [...result.errors, `Migration failed: ${error}`]
    }
  }
}
