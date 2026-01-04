import fs from 'fs/promises'
import path from 'path'
import { insertMediaItem, insertTVEpisode, getMediaItemByPath, getSetting } from './db.js'
import { searchMovie, parseMovieTitle } from './tmdb.js'

interface ScanResult {
  added: number
  updated: number
  errors: string[]
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
        // Insert or update show
        const existingShow = await getMediaItemByPath(relativePath)
        const showId = await insertMediaItem({
          type: 'tv_show',
          title: showEntry.name,
          path: relativePath,
          last_scanned: now
        })
        
        if (existingShow) {
          result.updated++
        } else {
          result.added++
        }
        
        // Scan seasons
        const seasons = await fs.readdir(showPath, { withFileTypes: true })
        
        for (const seasonEntry of seasons) {
          if (!seasonEntry.isDirectory() || !/season\s*\d+/i.test(seasonEntry.name)) continue
          
          const seasonMatch = seasonEntry.name.match(/season\s*(\d+)/i)
          const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : 0
          
          const seasonPath = path.join(showPath, seasonEntry.name)
          const episodes = await fs.readdir(seasonPath, { withFileTypes: true })
          
          for (const episodeEntry of episodes) {
            if (episodeEntry.isDirectory()) continue
            
            const ext = path.extname(episodeEntry.name).toLowerCase()
            const videoExts = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
            if (!videoExts.includes(ext)) continue
            
            // Parse episode number from filename (e.g., "S01E05" or "Episode 5")
            const episodeMatch = episodeEntry.name.match(/(?:e|episode\s*)(\d+)/i)
            const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0
            
            const episodePath = path.join(seasonPath, episodeEntry.name)
            const fileSize = await getFileSize(episodePath)
            
            await insertTVEpisode({
              show_id: showId,
              season_number: seasonNumber,
              episode_number: episodeNumber,
              title: episodeEntry.name,
              file_path: path.join(relativePath, seasonEntry.name, episodeEntry.name),
              file_size: fileSize,
              last_scanned: now
            })
          }
        }
      } catch (error) {
        result.errors.push(`Error scanning show ${showEntry.name}: ${error}`)
      }
    }
  } catch (error) {
    result.errors.push(`Error scanning TV shows directory: ${error}`)
  }
  
  return result
}

export async function scanMovies(moviesPath: string): Promise<ScanResult> {
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
        const shouldFetchMetadata = metadataEnabled === 'true'
        
        // Fetch metadata from TMDB if enabled and not already cached
        let metadataJson = existingMovie?.metadata_json
        if (!metadataJson && shouldFetchMetadata) {
          console.log(`Fetching TMDB metadata for movie: ${title}`)
          const { title: cleanTitle, year } = parseMovieTitle(title)
          console.log(`Parsed title: "${cleanTitle}", year: ${year}`)
          const metadata = await searchMovie(cleanTitle, year)
          if (metadata) {
            metadataJson = JSON.stringify(metadata)
            console.log(`Cached TMDB metadata for: ${metadata.title}`)
          } else {
            console.log(`No TMDB metadata found for: ${title}`)
          }
        } else if (!metadataJson) {
          console.log(`Metadata scanning disabled for movies, skipping: ${title}`)
        } else {
          console.log(`Using cached metadata for: ${title}`)
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
    
    const entries = await fs.readdir(booksPath, { withFileTypes: true })
    
    for (const entry of entries) {
      try {
        const bookPath = path.join(booksPath, entry.name)
        let fileSize = 0
        let title = entry.name
        
        if (entry.isDirectory()) {
          // If it's a folder, count files inside
          const files = await fs.readdir(bookPath, { withFileTypes: true })
          const bookFiles = files.filter(f => {
            const ext = path.extname(f.name).toLowerCase()
            return ['.epub', '.pdf', '.mobi', '.azw3', '.cbz', '.cbr'].includes(ext)
          })
          
          for (const bf of bookFiles) {
            fileSize += await getFileSize(path.join(bookPath, bf.name))
          }
          
          title = entry.name
        } else {
          // If it's a file, check if it's a book format
          const ext = path.extname(entry.name).toLowerCase()
          const bookExts = ['.epub', '.pdf', '.mobi', '.azw3', '.cbz', '.cbr']
          
          if (bookExts.includes(ext)) {
            fileSize = await getFileSize(bookPath)
            title = path.basename(entry.name, ext)
          } else {
            continue // Skip non-book files
          }
        }
        
        const existingBook = await getMediaItemByPath(entry.name)
        
        await insertMediaItem({
          type: 'book',
          title,
          path: entry.name,
          file_size: fileSize,
          last_scanned: now
        })
        
        if (existingBook) {
          result.updated++
        } else {
          result.added++
        }
      } catch (error) {
        result.errors.push(`Error scanning book ${entry.name}: ${error}`)
      }
    }
  } catch (error) {
    result.errors.push(`Error scanning books directory: ${error}`)
  }
  
  return result
}

export async function scanAllMedia(
  tvShowsPath: string,
  moviesPath: string,
  booksPath: string
): Promise<{ tvShows: ScanResult; movies: ScanResult; books: ScanResult }> {
  const [tvShows, movies, books] = await Promise.all([
    scanTVShows(tvShowsPath),
    scanMovies(moviesPath),
    scanBooks(booksPath)
  ])
  
  return { tvShows, movies, books }
}
