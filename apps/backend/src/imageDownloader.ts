import fs from 'fs/promises'
import path from 'path'
import { getSetting } from './db.js'

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`Downloading image from ${url} to ${outputPath}`)
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`)
      return false
    }

    const buffer = await response.arrayBuffer()
    const directory = path.dirname(outputPath)
    
    // Create directory if it doesn't exist
    await fs.mkdir(directory, { recursive: true })
    
    // Write the image file
    await fs.writeFile(outputPath, Buffer.from(buffer))
    console.log(`Image saved to ${outputPath}`)
    return true
  } catch (error) {
    console.error(`Error downloading image:`, error)
    return false
  }
}

export async function saveMoviePoster(posterUrl: string | null, movieDirectory: string): Promise<string | null> {
  if (!posterUrl) return null
  
  const saveLocally = await getSetting('save_images_locally')
  if (saveLocally !== 'true') return posterUrl
  
  try {
    const outputPath = path.join(movieDirectory, 'poster.jpg')
    const success = await downloadImage(posterUrl, outputPath)
    
    if (success) {
      // Return relative path from movie directory
      return 'poster.jpg'
    }
  } catch (error) {
    console.error('Failed to save movie poster:', error)
  }
  
  return posterUrl
}

export async function saveTVShowPoster(posterUrl: string | null, showDirectory: string): Promise<string | null> {
  if (!posterUrl) return null
  
  const saveLocally = await getSetting('save_images_locally')
  if (saveLocally !== 'true') return posterUrl
  
  try {
    const outputPath = path.join(showDirectory, 'poster.jpg')
    const success = await downloadImage(posterUrl, outputPath)
    
    if (success) {
      return 'poster.jpg'
    }
  } catch (error) {
    console.error('Failed to save TV show poster:', error)
  }
  
  return posterUrl
}

export async function saveEpisodeThumb(thumbUrl: string | null, seasonDirectory: string, episodeNumber: number): Promise<string | null> {
  if (!thumbUrl) return null
  
  const saveLocally = await getSetting('save_images_locally')
  if (saveLocally !== 'true') return thumbUrl
  
  try {
    const outputPath = path.join(seasonDirectory, `episode_${episodeNumber}_thumb.jpg`)
    const success = await downloadImage(thumbUrl, outputPath)
    
    if (success) {
      return `episode_${episodeNumber}_thumb.jpg`
    }
  } catch (error) {
    console.error('Failed to save episode thumbnail:', error)
  }
  
  return thumbUrl
}
