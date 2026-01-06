import fs from 'fs/promises'
import path from 'path'
import { insertMediaItem, insertTVEpisode, getMediaItemByPath, getSetting, getMediaItemsByType, deleteMediaItem, insertAuthor, insertSeries, insertBook, getBookByPath, getAllBooks, getAllAuthors, getSeriesByAuthor, deleteBook, deleteAuthor, deleteSeries } from './db.js'
import { searchMovie, parseMovieTitle } from './tmdb.js'
import { searchTVShow, parseTVShowTitle, getEpisodeMetadata } from './tvdb.js'
import { searchBook } from './hardcover.js'
import { saveMoviePoster, saveTVShowPoster, saveEpisodeThumb } from './imageDownloader.js'

interface ScanResult {
  added: number
  updated: number
  errors: string[]
}

type ProgressCallback = (data: any) => void
let progressCallback: ProgressCallback | null = null

export function setProgressCallback(callback: ProgressCallback | null) {
  progressCallback = callback
}

function emitProgress(data: any) {
  if (progressCallback) {
    progressCallback(data)
  }
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

export async function scanTVShows(tvShowsPath: string): Promise<ScanResult> {
  const result: ScanResult = { added: 0, updated: 0, errors: [] }
  const now = Date.now()
  
  try {
    // Check if directory exists
    try {
      await fs.access(tvShowsPath)
    } catch {
      console.log(`TV shows directory does not exist: ${tvShowsPath}`)
      return result
    }
    
    const shows = await fs.readdir(tvShowsPath, { withFileTypes: true })
    
    for (const showEntry of shows) {
      if (!showEntry.isDirectory()) continue
      
      const showPath = path.join(tvShowsPath, showEntry.name)
      const relativePath = showEntry.name
      
      try {
        // Check if metadata scanning is enabled
        const metadataEnabled = await getSetting('tv_metadata_enabled')
        const shouldFetchMetadata = metadataEnabled === 'true'
        
        // Fetch metadata from TVDB if enabled and not already cached
        const existingShow = await getMediaItemByPath(relativePath)
        let metadataJson = existingShow?.metadata_json
        
        if (!metadataJson && shouldFetchMetadata) {
          console.log(`Fetching TVDB metadata for show: ${showEntry.name}`)
          emitProgress({ type: 'scanning', category: 'tv', item: showEntry.name, status: 'fetching_metadata' })
          const { title: cleanTitle, year } = parseTVShowTitle(showEntry.name)
          console.log(`Parsed title: "${cleanTitle}", year: ${year}`)
          const metadata = await searchTVShow(cleanTitle, year)
          if (metadata) {
            // Save poster locally if enabled
            if (metadata.poster_url) {
              const savedPosterPath = await saveTVShowPoster(metadata.poster_url, showPath)
              // Update metadata with local path if image was saved
              if (savedPosterPath !== metadata.poster_url) {
                metadata.poster_url = savedPosterPath
              }
            }
            
            metadataJson = JSON.stringify(metadata)
            console.log(`Cached TVDB metadata for: ${metadata.title}`)
            emitProgress({ type: 'scanned', category: 'tv', item: showEntry.name, status: 'metadata_fetched', title: metadata.title })
          } else {
            console.log(`No TVDB metadata found for: ${showEntry.name}`)
            emitProgress({ type: 'scanned', category: 'tv', item: showEntry.name, status: 'no_metadata' })
          }
        } else if (!metadataJson) {
          console.log(`Metadata scanning disabled for TV shows, skipping: ${showEntry.name}`)
          emitProgress({ type: 'scanned', category: 'tv', item: showEntry.name, status: 'skipped' })
        } else {
          console.log(`Using cached metadata for: ${showEntry.name}`)
          emitProgress({ type: 'scanned', category: 'tv', item: showEntry.name, status: 'cached' })
        }
        
        // Insert or update show
        const showId = await insertMediaItem({
          type: 'tv_show',
          title: showEntry.name,
          path: relativePath,
          last_scanned: now,
          metadata_json: metadataJson || existingShow?.metadata_json || undefined
        })
        
        if (existingShow) {
          result.updated++
        } else {
          result.added++
        }
        
        // Scan seasons
        const seasons = await fs.readdir(showPath, { withFileTypes: true })
        
        // Check if episode metadata scanning is enabled
        const episodesMetadataEnabled = await getSetting('tv_episodes_metadata_enabled')
        const shouldFetchEpisodeMetadata = episodesMetadataEnabled === 'true'
        
        // Get the series ID for episode metadata
        let seriesId: string | null = null
        if (shouldFetchEpisodeMetadata && metadataJson) {
          try {
            const showMetadata = JSON.parse(metadataJson)
            seriesId = showMetadata.tvdb_id
          } catch (e) {
            console.error('Failed to parse show metadata:', e)
          }
        }
        
        for (const seasonEntry of seasons) {
          if (!seasonEntry.isDirectory() || !/season\s*\d+/i.test(seasonEntry.name)) continue
          
          const seasonMatch = seasonEntry.name.match(/season\s*(\d+)/i)
          const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : 0
          
          const seasonPath = path.join(showPath, seasonEntry.name)
          const episodeFiles = await fs.readdir(seasonPath, { withFileTypes: true })
          
          for (const episodeEntry of episodeFiles) {
            if (episodeEntry.isDirectory()) continue
            
            const ext = path.extname(episodeEntry.name).toLowerCase()
            const videoExts = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
            if (!videoExts.includes(ext)) continue
            
            // Parse episode number from filename (e.g., "S01E05" or "Episode 5")
            const episodeMatch = episodeEntry.name.match(/(?:e|episode\s*)(\d+)/i)
            const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0
            
            const episodePath = path.join(seasonPath, episodeEntry.name)
            const fileSize = await getFileSize(episodePath)
            
            // Fetch episode metadata if enabled
            let episodeMetadataJson: string | undefined = undefined
            if (shouldFetchEpisodeMetadata && seriesId && episodeNumber > 0) {
              console.log(`Fetching episode metadata for S${seasonNumber}E${episodeNumber}`)
              const episodeMetadata = await getEpisodeMetadata(seriesId, seasonNumber, episodeNumber)
              if (episodeMetadata) {
                // Save thumbnail locally if enabled
                if (episodeMetadata.still_url) {
                  const savedThumbPath = await saveEpisodeThumb(
                    episodeMetadata.still_url,
                    seasonPath,
                    episodeNumber
                  )
                  // Update metadata with local path if image was saved
                  if (savedThumbPath !== episodeMetadata.still_url) {
                    episodeMetadata.still_url = savedThumbPath
                  }
                }
                
                episodeMetadataJson = JSON.stringify(episodeMetadata)
                console.log(`Cached episode metadata: ${episodeMetadata.name}`)
              }
            }
            
            await insertTVEpisode({
              show_id: showId,
              season_number: seasonNumber,
              episode_number: episodeNumber,
              title: episodeEntry.name,
              file_path: path.join(relativePath, seasonEntry.name, episodeEntry.name),
              file_size: fileSize,
              last_scanned: now,
              metadata_json: episodeMetadataJson
            })
          }
        }
      } catch (error) {
        console.error(`Error scanning show ${showEntry.name}:`, error)
        result.errors.push(`Error scanning show ${showEntry.name}: ${error}`)
      }
    }
  } catch (error) {
    result.errors.push(`Error scanning TV shows directory: ${error}`)
  }
  
  return result
}

export async function scanMovies(moviesPath: string, skipMetadata = false): Promise<ScanResult> {
  const result: ScanResult = { added: 0, updated: 0, errors: [] }
  const now = Date.now()
  
  try {
    // Check if directory exists
    try {
      await fs.access(moviesPath)
    } catch {
      console.log(`Movies directory does not exist: ${moviesPath}`)
      return result
    }
    
    const entries = await fs.readdir(moviesPath, { withFileTypes: true })
    
    for (const entry of entries) {
      try {
        const moviePath = path.join(moviesPath, entry.name)
        let fileSize = 0
        let title = entry.name
        
        if (entry.isDirectory()) {
          // If it's a folder, look for the largest video file inside
          const files = await fs.readdir(moviePath, { withFileTypes: true })
          const videoFiles = files.filter(f => {
            const ext = path.extname(f.name).toLowerCase()
            return ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'].includes(ext)
          })
          
          if (videoFiles.length > 0) {
            // Use the largest video file
            let largestFile = videoFiles[0]
            let largestSize = 0
            
            for (const vf of videoFiles) {
              const size = await getFileSize(path.join(moviePath, vf.name))
              if (size > largestSize) {
                largestSize = size
                largestFile = vf
              }
            }
            
            fileSize = largestSize
            title = entry.name // Keep folder name as title
          }
        } else {
          // If it's a file, check if it's a video
          const ext = path.extname(entry.name).toLowerCase()
          const videoExts = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
          
          if (videoExts.includes(ext)) {
            fileSize = await getFileSize(moviePath)
            title = path.basename(entry.name, ext)
          } else {
            continue // Skip non-video files
          }
        }
        
        const existingMovie = await getMediaItemByPath(entry.name)
        
        // Check if metadata scanning is enabled
        const metadataEnabled = await getSetting('movies_metadata_enabled')
        const shouldFetchMetadata = !skipMetadata && metadataEnabled === 'true'
        
        // Fetch metadata from TMDB if enabled and not already cached
        let metadataJson = existingMovie?.metadata_json
        if (!metadataJson && shouldFetchMetadata) {
          console.log(`Fetching TMDB metadata for movie: ${title}`)
          emitProgress({ type: 'scanning', category: 'movies', item: title, status: 'fetching_metadata' })
          const { title: cleanTitle, year } = parseMovieTitle(title)
          console.log(`Parsed title: "${cleanTitle}", year: ${year}`)
          const metadata = await searchMovie(cleanTitle, year)
          if (metadata) {
            metadataJson = JSON.stringify(metadata)
            console.log(`Cached TMDB metadata for: ${metadata.title}`)
            emitProgress({ type: 'scanned', category: 'movies', item: title, status: 'metadata_fetched', title: metadata.title })
          } else {
            console.log(`No TMDB metadata found for: ${title}`)
            emitProgress({ type: 'scanned', category: 'movies', item: title, status: 'no_metadata' })
          }
        } else if (!metadataJson) {
          console.log(`Metadata scanning disabled for movies, skipping: ${title}`)
          emitProgress({ type: 'scanned', category: 'movies', item: title, status: 'skipped' })
        } else {
          console.log(`Using cached metadata for: ${title}`)
          emitProgress({ type: 'scanned', category: 'movies', item: title, status: 'cached' })
        }
        
        await insertMediaItem({
          type: 'movie',
          title,
          path: entry.name,
          file_size: fileSize,
          last_scanned: now,
          metadata_json: metadataJson || existingMovie?.metadata_json || undefined
        })
        
        if (existingMovie) {
          result.updated++
        } else {
          result.added++
        }
      } catch (error) {
        result.errors.push(`Error scanning movie ${entry.name}: ${error}`)
      }
    }
  } catch (error) {
    result.errors.push(`Error scanning movies directory: ${error}`)
  }
  
  return result
}

export async function scanBooks(booksPath: string, mediaType?: 'audiobook' | 'ebook'): Promise<ScanResult> {
  const result: ScanResult = { added: 0, updated: 0, errors: [] }
  const now = Date.now()

  try {
    // Check if directory exists
    try {
      await fs.access(booksPath)
    } catch {
      console.log(`Books directory does not exist: ${booksPath}`)
      return result
    }

    // Clean up orphaned database entries (books whose files no longer exist)
    console.log('Checking for orphaned book entries...')
    const allBooksInDb = await getAllBooks()

    for (const book of allBooksInDb) {
      const fullPath = path.join(booksPath.replace(/\/(audiobooks|ebooks)$/, ''), book.path)
      try {
        await fs.access(fullPath)
      } catch {
        console.log(`Removing orphaned book entry: ${book.path} (id: ${book.id})`)
        await deleteBook(book.id as number)
      }
    }

    // Clean up orphaned series (series with no books)
    const allAuthorsInDb = await getAllAuthors()
    for (const author of allAuthorsInDb) {
      const seriesList = await getSeriesByAuthor(author.id as number)
      for (const series of seriesList) {
        const booksInSeries = await getAllBooks()
        const hasBooks = booksInSeries.some(b => b.series_id === series.id)
        if (!hasBooks) {
          console.log(`Removing orphaned series: ${series.name} (id: ${series.id})`)
          await deleteSeries(series.id as number)
        }
      }

      // Clean up orphaned authors (authors with no books)
      const authorBooks = await getAllBooks()
      const hasAuthorBooks = authorBooks.some(b => b.author_id === author.id)
      if (!hasAuthorBooks) {
        console.log(`Removing orphaned author: ${author.name} (id: ${author.id})`)
        await deleteAuthor(author.id as number)
      }
    }

    // Determine if we're already at a specific subdirectory level or the parent books directory
    const pathParts = booksPath.split(path.sep)
    const lastDir = pathParts[pathParts.length - 1]

    let subdirs: string[]
    let basePath: string

    if (lastDir === 'audiobooks' || lastDir === 'ebooks') {
      subdirs = ['']
      basePath = booksPath
    } else {
      subdirs = ['audiobooks', 'ebooks']
      basePath = booksPath
    }

    // Check if metadata scanning is enabled
    const metadataEnabled = await getSetting('books_metadata_enabled')
    const shouldFetchMetadata = metadataEnabled === 'true'

    for (const subdir of subdirs) {
      const subdirPath = subdir ? path.join(basePath, subdir) : basePath

      try {
        await fs.access(subdirPath)
      } catch {
        console.log(`${subdir || 'books'} directory does not exist: ${subdirPath}`)
        continue
      }

      // Determine media type from path
      const currentMediaType = subdirPath.includes('audiobooks') || subdirPath.includes('audiobook') ? 'audiobook' : 'ebook'
      console.log(`Scanning ${subdir || lastDir}...`)

      // Scan authors
      const authorDirs = await fs.readdir(subdirPath, { withFileTypes: true })

      for (const authorDir of authorDirs) {
        if (!authorDir.isDirectory()) continue

        const authorName = authorDir.name
        const authorPath = path.join(subdirPath, authorName)

        // Create or update author record
        const authorId = await insertAuthor({
          name: authorName,
          created_at: now,
          last_scanned: now
        })

        // Scan subdirectories in author folder
        const authorSubdirs = await fs.readdir(authorPath, { withFileTypes: true })

        for (const potentialSeriesOrBook of authorSubdirs) {
          if (!potentialSeriesOrBook.isDirectory()) continue

          const itemPath = path.join(authorPath, potentialSeriesOrBook.name)
          const itemContents = await fs.readdir(itemPath, { withFileTypes: true })

          // Check if this directory contains book files directly (standalone book)
          // or subdirectories with book files (series)
          const hasBookFiles = itemContents.some(f => {
            const ext = path.extname(f.name).toLowerCase()
            if (currentMediaType === 'ebook') {
              return ['.epub', '.pdf', '.mobi', '.azw3', '.cbz', '.cbr'].includes(ext)
            } else {
              return ['.mp3', '.m4a', '.m4b', '.flac', '.ogg'].includes(ext)
            }
          })

          const hasSubdirs = itemContents.some(f => f.isDirectory())

          if (hasBookFiles && !hasSubdirs) {
            // Standalone book: Author/BookTitle/files
            await processBookDirectory(
              itemPath,
              potentialSeriesOrBook.name,
              authorId,
              authorName,
              null, // no series
              currentMediaType,
              subdir || (currentMediaType === 'audiobook' ? 'audiobooks' : 'ebooks'),
              shouldFetchMetadata,
              now,
              result
            )
          } else if (hasSubdirs) {
            // This is a series: Author/SeriesName/Book1/, Book2/, etc.
            const seriesName = potentialSeriesOrBook.name

            // Create or update series record
            const seriesId = await insertSeries({
              author_id: authorId,
              name: seriesName,
              created_at: now,
              last_scanned: now
            })

            // Scan each book directory in the series
            for (const bookDir of itemContents) {
              if (!bookDir.isDirectory()) continue

              const bookPath = path.join(itemPath, bookDir.name)
              await processBookDirectory(
                bookPath,
                bookDir.name,
                authorId,
                authorName,
                seriesId,
                currentMediaType,
                subdir || (currentMediaType === 'audiobook' ? 'audiobooks' : 'ebooks'),
                shouldFetchMetadata,
                now,
                result
              )
            }
          }
        }
      }
    }

    return result
  } catch (error) {
    console.error('Error scanning books:', error)
    result.errors.push(`Failed to scan books: ${error}`)
    return result
  }
}

// Helper function to process a single book directory
async function processBookDirectory(
  bookPath: string,
  bookTitle: string,
  authorId: number,
  authorName: string,
  seriesId: number | null,
  mediaType: 'audiobook' | 'ebook',
  pathPrefix: string,
  shouldFetchMetadata: boolean,
  now: number,
  result: ScanResult
): Promise<void> {
  try {
    const files = await fs.readdir(bookPath, { withFileTypes: true })

    // Filter relevant book files
    const bookFiles = files.filter(f => {
      const ext = path.extname(f.name).toLowerCase()
      if (mediaType === 'ebook') {
        return ['.epub', '.pdf', '.mobi', '.azw3', '.cbz', '.cbr'].includes(ext)
      } else {
        return ['.mp3', '.m4a', '.m4b', '.flac', '.ogg'].includes(ext)
      }
    })

    if (bookFiles.length === 0) return

    // Calculate total file size
    let fileSize = 0
    for (const bf of bookFiles) {
      fileSize += await getFileSize(path.join(bookPath, bf.name))
    }

    // Construct relative path
    // For series: {type}/Author/Series/BookTitle
    // For standalone: {type}/Author/BookTitle
    const pathParts = bookPath.split(path.sep)
    const relevantParts = pathParts.slice(pathParts.length - (seriesId ? 4 : 3))
    relevantParts[0] = pathPrefix
    const relativePath = path.join(...relevantParts)

    // Check if book already exists
    const foundBook = await getBookByPath(relativePath)

    let metadataJson = foundBook?.metadata_json

    // Fetch metadata if needed
    if (!metadataJson && shouldFetchMetadata) {
      console.log(`Fetching Hardcover metadata for: ${authorName} - ${bookTitle}`)
      emitProgress({
        type: 'scanning',
        category: 'books',
        item: `${authorName} - ${bookTitle}`,
        status: 'fetching_metadata'
      })

      const metadata = await searchBook(bookTitle, authorName)
      if (metadata) {
        metadataJson = JSON.stringify(metadata)
        console.log(`Cached Hardcover metadata for: ${metadata.title}`)
        emitProgress({
          type: 'scanned',
          category: 'books',
          item: `${authorName} - ${bookTitle}`,
          status: 'metadata_fetched',
          title: metadata.title
        })
      } else {
        console.log(`No Hardcover metadata found for: ${authorName} - ${bookTitle}`)
        emitProgress({
          type: 'scanned',
          category: 'books',
          item: `${authorName} - ${bookTitle}`,
          status: 'no_metadata'
        })
      }
    } else if (!metadataJson) {
      console.log(`Metadata scanning disabled for books, skipping: ${authorName} - ${bookTitle}`)
      emitProgress({
        type: 'scanned',
        category: 'books',
        item: `${authorName} - ${bookTitle}`,
        status: 'skipped'
      })
    } else {
      console.log(`Using cached metadata for: ${authorName} - ${bookTitle}`)
      emitProgress({
        type: 'scanned',
        category: 'books',
        item: `${authorName} - ${bookTitle}`,
        status: 'cached'
      })
    }

    // Insert or update book
    await insertBook({
      series_id: seriesId || undefined,
      author_id: authorId,
      title: bookTitle,
      type: mediaType,
      path: relativePath,
      file_size: fileSize,
      last_scanned: now,
      metadata_json: metadataJson || undefined
    })

    if (foundBook) {
      result.updated++
    } else {
      result.added++
    }

    console.log(`  [${mediaType}] ${authorName} - ${bookTitle}`)
  } catch (error) {
    console.error(`Error processing book directory ${bookPath}:`, error)
    result.errors.push(`Failed to process ${bookTitle}: ${error}`)
  }
}

export async function scanAllMedia(
  tvShowsPath: string,
  moviesPath: string,
  booksPath: string,
  skipMetadata = false
): Promise<{ tvShows: ScanResult; movies: ScanResult; books: ScanResult }> {
  const [tvShows, movies, books] = await Promise.all([
    scanTVShows(tvShowsPath),
    scanMovies(moviesPath, skipMetadata),
    scanBooks(booksPath)
  ])
  
  return { tvShows, movies, books }
}
