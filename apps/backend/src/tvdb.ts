import fetch from 'node-fetch'
import type { TVShowMetadata, EpisodeMetadata, ApiConnectionTestResult } from './types.js'

// Re-export for use by other modules
export type { TVShowMetadata, EpisodeMetadata }

const TVDB_API_KEY = process.env.TVDB_API_KEY
const TVDB_BASE_URL = 'https://api4.thetvdb.com/v4'

// Rate limiting: Conservative 2 req/sec (500ms delay)
const RATE_LIMIT_DELAY = 500
let lastRequestTime = 0
let authToken: string | null = null
let tokenExpiry = 0

async function rateLimitedFetch(url: string, options?: any) {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastRequestTime = Date.now()
  return fetch(url, options)
}

async function getAuthToken(): Promise<string | null> {
  if (!TVDB_API_KEY) {
    console.warn('TVDB_API_KEY not configured')
    return null
  }

  // Reuse token if still valid (tokens last ~30 days, refresh at 24 hours)
  const now = Date.now()
  if (authToken && tokenExpiry > now) {
    return authToken
  }

  try {
    const response = await rateLimitedFetch(`${TVDB_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apikey: TVDB_API_KEY })
    })

    if (!response.ok) {
      console.error(`TVDB auth error: ${response.status}`)
      return null
    }

    const data = await response.json() as any
    authToken = data.data.token
    tokenExpiry = now + (24 * 60 * 60 * 1000) // 24 hours
    
    console.log('TVDB authentication successful')
    return authToken
  } catch (error) {
    console.error('TVDB authentication failed:', error)
    return null
  }
}

export async function testTVDBConnection(): Promise<ApiConnectionTestResult> {
  try {
    const token = await getAuthToken()
    if (token) {
      return { success: true, message: 'TVDB API connection successful' }
    } else {
      return { success: false, message: 'Failed to authenticate with TVDB' }
    }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error}` }
  }
}

interface TVDBSeriesResult {
  id: string
  tvdb_id?: string
  name: string
  overview: string
  first_air_time: string
  image_url: string | null
  primary_language: string
  status: string
  year: string
}

interface TVDBSearchResponse {
  data: TVDBSeriesResult[]
  status: string
}

interface TVDBSeriesDetails {
  id: string
  tvdb_id?: string
  name: string
  overview: string
  first_air_time: string
  image: string | null
  year: string
  status: {
    name: string
  }
}

interface TVDBSeriesExtended {
  id: string
  tvdb_id?: string
  name: string
  overview: string
  first_air_time: string
  image: string | null
  year: string
  status: {
    name: string
  }
  genres: Array<{ name: string }>
  averageRuntime: number | null
  originalNetwork: { name: string } | null
  latestNetwork: { name: string } | null
  originalLanguage: string
  seasons: any[] | null
}

export async function searchTVShow(title: string, year?: string): Promise<TVShowMetadata | null> {
  const token = await getAuthToken()
  if (!token) {
    return null
  }

  try {
    console.log(` Searching TVDB for: "${title}" ${year ? `(year: ${year})` : ''}`)
    
    const params = new URLSearchParams({
      query: title
    })

    if (year) {
      params.append('year', year)
    }

    const response = await rateLimitedFetch(`${TVDB_BASE_URL}/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`TVDB API error: ${response.status}`)
      return null
    }

    const data = await response.json() as TVDBSearchResponse
    console.log(`TVDB returned ${data.data?.length || 0} results`)

    if (!data.data || data.data.length === 0) {
      console.log(`No TVDB results for "${title}"`)
      return null
    }

    // Take the first result and fetch extended details
    const show = data.data[0]
    const showId = show.tvdb_id || show.id
    console.log(`Found: ${show.name} (${show.year}) - TVDB ID: ${showId}`)

    // Fetch extended series details
    const detailsResponse = await rateLimitedFetch(`${TVDB_BASE_URL}/series/${showId}/extended`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!detailsResponse.ok) {
      console.error(`Failed to fetch TV show details: ${detailsResponse.status}`)
      // Fall back to basic data
      return {
        tvdb_id: showId,
        title: show.name,
        overview: show.overview || '',
        first_air_year: show.year || show.first_air_time?.split('-')[0] || '',
        poster_url: show.image_url || null,
        status: show.status || 'Unknown',
        genres: [],
        runtime: null,
        network: null,
        original_language: show.primary_language || '',
        num_seasons: 0
      }
    }

    const details = await detailsResponse.json() as { data: TVDBSeriesExtended }
    const extended = details.data
    const extendedId = extended.tvdb_id || extended.id
    console.log(`Fetched extended details for: ${extended.name}`)

    return {
      tvdb_id: extendedId,
      title: extended.name,
      overview: extended.overview || '',
      first_air_year: extended.year || extended.first_air_time?.split('-')[0] || '',
      poster_url: extended.image || show.image_url || null,
      status: extended.status?.name || 'Unknown',
      genres: extended.genres?.map(g => g.name) || [],
      runtime: extended.averageRuntime,
      network: extended.latestNetwork?.name || extended.originalNetwork?.name || null,
      original_language: extended.originalLanguage || '',
      num_seasons: extended.seasons?.length || 0
    }
  } catch (error) {
    console.error('TVDB search error:', error)
    return null
  }
}

// Parse TV show title from directory name
// Examples:
//   "Breaking Bad (2008)" -> { title: "Breaking Bad", year: "2008" }
//   "Game of Thrones" -> { title: "Game of Thrones", year: undefined }
export function parseTVShowTitle(filename: string): { title: string; year?: string } {
  // Try to extract year from (YYYY) pattern
  const yearMatch = filename.match(/\((\d{4})\)/)
  
  if (yearMatch) {
    const year = yearMatch[1]
    const title = filename.replace(/\s*\(\d{4}\)\s*/, '').trim()
    return { title, year }
  }
  
  return { title: filename.trim() }
}

export async function getEpisodeMetadata(seriesId: string, seasonNumber: number, episodeNumber: number): Promise<EpisodeMetadata | null> {
  const token = await getAuthToken()
  if (!token) {
    return null
  }

  try {
    console.log(` Fetching TVDB episode metadata for series ${seriesId}, S${seasonNumber}E${episodeNumber}`)
    
    // First get all episodes for the season
    const response = await rateLimitedFetch(
      `${TVDB_BASE_URL}/series/${seriesId}/episodes/default?season=${seasonNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      console.error(`TVDB API error: ${response.status}`)
      return null
    }

    const data = await response.json() as any
    const episodes = data.data?.episodes || []
    
    // Find the specific episode
    const episode = episodes.find((ep: any) => ep.number === episodeNumber)
    
    if (!episode) {
      console.log(`Episode ${episodeNumber} not found in season ${seasonNumber}`)
      return null
    }

    console.log(`Found episode: ${episode.name} - TVDB ID: ${episode.id}`)
    console.log(`Episode image path:`, episode.image)

    return {
      tvdb_id: episode.id?.toString() || '',
      name: episode.name || `Episode ${episodeNumber}`,
      overview: episode.overview || '',
      aired: episode.aired || '',
      still_url: episode.image || null,
      season_number: seasonNumber,
      episode_number: episodeNumber
    }
  } catch (error) {
    console.error('TVDB episode fetch error:', error)
    return null
  }
}
