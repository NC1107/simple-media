import fs from 'fs/promises'
import path from 'path'
import { insertMediaItem, insertTVEpisode, getMediaItemByPath, getSetting } from './db.js'
import { searchMovie, parseMovieTitle } from './tmdb.js'
import { searchTVShow, parseTVShowTitle, getEpisodeMetadata } from './tvdb.js'
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
          metadata_json: metadataJson
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
          metadata_json: metadataJson
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

export async function scanBooks(booksPath: string): Promise<ScanResult> {
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
    
    // Scan both audiobooks and ebooks subdirectories
    const subdirs = ['audiobooks', 'ebooks']
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(booksPath, subdir)
      
      try {
        await fs.access(subdirPath)
      } catch {
        console.log(`${subdir} directory does not exist: ${subdirPath}`)
        continue
      }
      
      const mediaType = subdir === 'audiobooks' ? 'audiobook' : 'ebook'
      console.log(`Scanning ${subdir}...`)
      
      // Scan authors
      const authors = await fs.readdir(subdirPath, { withFileTypes: true })
      
      for (const authorDir of authors) {
        if (!authorDir.isDirectory()) continue
        
        const authorPath = path.join(subdirPath, authorDir.name)
        const series = await fs.readdir(authorPath, { withFileTypes: true })
        
        for (const seriesDir of series) {
          if (!seriesDir.isDirectory()) continue
          
          const seriesPath = path.join(authorPath, seriesDir.name)
          const files = await fs.readdir(seriesPath, { withFileTypes: true })
          
          // Filter relevant files
          const bookFiles = files.filter(f => {
            const ext = path.extname(f.name).toLowerCase()
            if (mediaType === 'ebook') {
              return ['.epub', '.pdf', '.mobi', '.azw3', '.cbz', '.cbr'].includes(ext)
            } else {
              return ['.mp3', '.m4a', '.m4b', '.flac', '.ogg'].includes(ext)
            }
          })
          
          if (bookFiles.length === 0) continue
          
          let fileSize = 0
          for (const bf of bookFiles) {
            fileSize += await getFileSize(path.join(seriesPath, bf.name))
          }
          
          // Store path as: {audiobooks|ebooks}/author/series
          const relativePath = path.join(subdir, authorDir.name, seriesDir.name)
          
          const existingBook = await getMediaItemByPath(relativePath)
          
          await insertMediaItem({
            type: mediaType as 'audiobook' | 'ebook',
            title: seriesDir.name,
            path: relativePath,
            file_size: fileSize,
            last_scanned: now
          })
          
          if (existingBook) {
            result.updated++
            emitProgress({
              type: 'scanned',
              category: 'books',
              item: `${authorDir.name} - ${seriesDir.name}`,
              status: 'cached'
            })
          } else {
            result.added++
            emitProgress({
              type: 'scanned',
              category: 'books',
              item: `${authorDir.name} - ${seriesDir.name}`,
              status: 'added'
            })
          }
          
          console.log(`  [${mediaType}] ${authorDir.name} - ${seriesDir.name}`)
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
