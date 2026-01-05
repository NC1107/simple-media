// =============================================================================
// Database Entity Types
// =============================================================================

export type MediaType = 'tv_show' | 'movie' | 'audiobook' | 'ebook'

export interface MediaItem {
  id?: number
  type: MediaType
  title: string
  path: string
  file_size?: number
  last_scanned: number
  metadata_json?: string
}

export interface TVEpisode {
  id?: number
  show_id: number
  season_number: number
  episode_number: number
  title: string
  file_path: string
  file_size: number
  last_scanned: number
  metadata_json?: string
}

// =============================================================================
// Metadata Types (returned by TMDB/TVDB APIs, stored in metadata_json)
// =============================================================================

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

export interface TVShowMetadata {
  tvdb_id: string
  title: string
  overview: string
  first_air_year: string
  poster_url: string | null
  status: string
  genres: string[]
  runtime: number | null
  network: string | null
  original_language: string
  num_seasons: number
}

export interface EpisodeMetadata {
  tvdb_id: string
  name: string
  overview: string
  aired: string
  still_url: string | null
  season_number: number
  episode_number: number
}

// =============================================================================
// API Types
// =============================================================================

export interface ApiConnectionTestResult {
  success: boolean
  message: string
}

export interface MediaStats {
  tvShows: number
  movies: number
  books: number
}
