import fetch from 'node-fetch'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

// Rate limiting: TMDB allows 50 req/sec, we'll be conservative at 4 req/sec (250ms delay)
const RATE_LIMIT_DELAY = 250 // milliseconds
let lastRequestTime = 0

async function rateLimitedFetch(url: string) {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastRequestTime = Date.now()
  return fetch(url)
}

export async function testTMDBConnection(): Promise<{ success: boolean; message: string }> {
  if (!TMDB_API_KEY) {
    return { success: false, message: 'TMDB API key not configured' }
  }

  try {
    const response = await rateLimitedFetch(`${TMDB_BASE_URL}/configuration?api_key=${TMDB_API_KEY}`)
    
    if (response.ok) {
      return { success: true, message: 'TMDB API connection successful' }
    } else if (response.status === 401) {
      return { success: false, message: 'Invalid API key' }
    } else {
      return { success: false, message: `TMDB API error: ${response.status}` }
    }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error}` }
  }
}

interface TMDBMovieResult {
  id: number
  title: string
  original_title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  genre_ids: number[]
}

interface TMDBSearchResponse {
  results: TMDBMovieResult[]
  total_results: number
}

interface Genre {
  id: number
  name: string
}

interface TMDBMovieDetails {
  id: number
  title: string
  original_title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  genres: Genre[]
  runtime: number | null
  tagline: string
  status: string
  budget: number
  revenue: number
  original_language: string
}

export interface MovieMetadata {
  tmdb_id: number
  title: string
  original_title: string
  overview: string
  release_year: string
  poster_url: string | null
  backdrop_url: string | null
  rating: number
  vote_count: number
  genres: string[]
  runtime: number | null
  tagline: string
  status: string
  original_language: string
}

export async function searchMovie(title: string, year?: string): Promise<MovieMetadata | null> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not configured')
    return null
  }

  try {
    console.log(` Searching TMDB for: "${title}" ${year ? `(year: ${year})` : ''}`)
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query: title,
      include_adult: 'false'
    })

    if (year) {
      params.append('year', year)
    }

    const response = await rateLimitedFetch(`${TMDB_BASE_URL}/search/movie?${params}`)
    
    if (!response.ok) {
      console.error(`TMDB API error: ${response.status}`)
      return null
    }

    const data = await response.json() as TMDBSearchResponse
    console.log(`TMDB returned ${data.results.length} results`)

    if (data.results.length === 0) {
      console.log(`No TMDB results for "${title}"`)
      return null
    }

    // Take the first result and fetch full details
    const movie = data.results[0]
    console.log(`Found: ${movie.title} (${movie.release_date?.split('-')[0]}) - TMDB ID: ${movie.id}`)

    // Fetch detailed movie info
    const detailsResponse = await rateLimitedFetch(`${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}`)
    if (!detailsResponse.ok) {
      console.error(`Failed to fetch movie details: ${detailsResponse.status}`)
      return null
    }

    const details = await detailsResponse.json() as TMDBMovieDetails
    console.log(`Fetched full details for: ${details.title}`)

    return {
      tmdb_id: details.id,
      title: details.title,
      original_title: details.original_title,
      overview: details.overview,
      release_year: details.release_date?.split('-')[0] || '',
      poster_url: details.poster_path ? `${TMDB_IMAGE_BASE}/w500${details.poster_path}` : null,
      backdrop_url: details.backdrop_path ? `${TMDB_IMAGE_BASE}/original${details.backdrop_path}` : null,
      rating: details.vote_average,
      vote_count: details.vote_count,
      genres: details.genres.map(g => g.name),
      runtime: details.runtime,
      tagline: details.tagline,
      status: details.status,
      original_language: details.original_language
    }
  } catch (error) {
    console.error('Error fetching movie metadata:', error)
    return null
  }
}

export function parseMovieTitle(filename: string): { title: string; year?: string } {
  // Try to extract title and year from common patterns:
  // "Movie Name (2024)"
  // "Movie Name [2024]"
  // "Movie.Name.2024.1080p"
  
  const yearMatch = filename.match(/[\(\[](\d{4})[\)\]]/)
  const year = yearMatch ? yearMatch[1] : undefined

  let title = filename
  
  // Remove year
  if (year) {
    title = title.replace(/[\(\[]?\d{4}[\)\]]?/, '')
  }
  
  // Remove quality indicators
  title = title.replace(/\b(1080p|720p|2160p|4K|WEBDL|BluRay|BRRip|DVDRip|HDTV|WEBRip)\b/gi, '')
  
  // Remove file extension
  title = title.replace(/\.\w{2,4}$/, '')
  
  // Replace dots and underscores with spaces
  title = title.replace(/[._]/g, ' ')
  
  // Clean up extra spaces
  title = title.trim().replace(/\s+/g, ' ')

  return { title, year }
}
