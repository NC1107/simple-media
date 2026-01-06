import { API_BASE_URL } from '../config'

/**
 * Resolves image URLs - handles both remote URLs and local paths
 * Local paths get converted to API endpoints that serve the images
 */
export function resolveImageUrl(
  imagePath: string | null | undefined,
  mediaPath: string,
  seasonNumber?: number
): string | undefined {
  if (!imagePath) return undefined

  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  // It's a local path, construct API URL
  if (seasonNumber !== undefined) {
    // Episode thumbnail
    return `${API_BASE_URL}/api/images/tv/${encodeURIComponent(mediaPath)}/Season ${seasonNumber}/${imagePath}`
  }

  // Show/movie poster
  return `${API_BASE_URL}/api/images/tv/${encodeURIComponent(mediaPath)}/${imagePath}`
}

/**
 * Simple image URL getter for books and other media
 * Returns the URL as-is if it's already a full URL, otherwise returns it
 */
export function getImageUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) return undefined

  // If it's already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // For local paths, return as-is (books API returns full URLs or local paths)
  return imageUrl
}
