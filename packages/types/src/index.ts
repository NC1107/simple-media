// =============================================================================
// Database Entity Types (used by backend for storage)
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
// API Response Types (what the frontend receives)
// =============================================================================

// TV Shows
export interface TVShowResponse {
  id: string
  name: string
  path: string
  metadata_json?: string
}

export interface SeasonResponse {
  id: string
  name: string
  seasonNumber: number
  path: string
}

export interface EpisodeResponse {
  id: string
  name: string
  episodeNumber: number
  path: string
  fileSize?: number
  metadata_json?: string
}

// Movies
export interface MovieResponse {
  id: string
  name: string
  path: string
  fileSize?: number
  metadata?: MovieMetadata | null
}

// Books
export interface BookResponse {
  id: string
  name: string
  path: string
  fileSize?: number
}

// =============================================================================
// API List Response Types
// =============================================================================

export interface TVShowsListResponse {
  shows: TVShowResponse[]
  total: number
  message?: string
}

export interface SeasonsListResponse {
  seasons: SeasonResponse[]
  total: number
  message?: string
}

export interface EpisodesListResponse {
  episodes: EpisodeResponse[]
  total: number
  message?: string
}

export interface MoviesListResponse {
  movies: MovieResponse[]
  total: number
  message?: string
}

export interface BooksListResponse {
  books: BookResponse[]
  total: number
  message?: string
}

// =============================================================================
// Scan Types
// =============================================================================

export interface ScanResult {
  added: number
  updated: number
  errors: string[]
}

export interface ScanAllResults {
  tvShows: ScanResult
  movies: ScanResult
  books: ScanResult
}

export interface ScanResponse {
  success: boolean
  added?: number
  updated?: number
  errors?: number
  results?: {
    tvShows: { added: number; updated: number; errors: number }
    movies: { added: number; updated: number; errors: number }
    books: { added: number; updated: number; errors: number }
  }
}

// =============================================================================
// Settings & Stats Types
// =============================================================================

export interface MediaStats {
  tvShows: number
  movies: number
  books: number
}

export interface ApiConnectionTestResult {
  success: boolean
  message: string
}

export interface ApiConnectionsResponse {
  tmdb: ApiConnectionTestResult
  tvdb: ApiConnectionTestResult
}

// =============================================================================
// Common Response Types
// =============================================================================

export interface SuccessResponse {
  success: boolean
}

export interface ErrorResponse {
  error: string
}

export interface MetadataResponse<T> {
  success: boolean
  metadata: T
}

export interface ClearMetadataResponse {
  success: boolean
  cleared: number
}