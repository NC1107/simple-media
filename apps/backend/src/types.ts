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

export interface Author {
  id?: number
  name: string
  metadata_json?: string
  created_at: number
  last_scanned: number
}

export interface BookSeries {
  id?: number
  author_id: number
  name: string
  metadata_json?: string
  created_at: number
  last_scanned: number
}

export interface Book {
  id?: number
  series_id?: number
  author_id: number
  title: string
  type: 'audiobook' | 'ebook'
  path: string
  file_size?: number
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
  overview: string | null
  release_year: string | null
  poster_url: string | null
  backdrop_url: string | null
  rating: number | null
  vote_count: number | null
  genres: string[]
  runtime: number | null
  tagline: string | null
  status: string | null
  original_language: string | null
}

export interface TVShowMetadata {
  tvdb_id: string
  title: string
  overview: string | null
  first_air_year: string | null
  poster_url: string | null
  backdrop_url: string | null
  status: string | null
  genres: string[]
  runtime: number | null
  network: string | null
  original_language: string | null
  num_seasons: number | null
  rating: number | null
}

export interface EpisodeMetadata {
  tvdb_id: string
  name: string
  overview: string | null
  aired: string | null
  still_url: string | null
  season_number: number
  episode_number: number
  runtime: number | null
}

export interface BookMetadata {
  hardcover_id: number
  title: string
  subtitle: string | null
  description: string | null
  authors: string[]
  series: string | null
  series_position: number | null
  pages: number | null
  isbn_10: string | null
  isbn_13: string | null
  release_date: string | null
  cover_url: string | null
  publisher: string | null
  language: string | null
  genres: string[]
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
