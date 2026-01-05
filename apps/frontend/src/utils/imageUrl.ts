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
