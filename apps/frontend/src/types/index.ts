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
// API Response Types (what the frontend receives from the backend)
// =============================================================================

// Movies
export interface Movie {
  id: string
  name: string
  path: string
  fileSize?: number
  metadata?: MovieMetadata | null
}

// TV Shows
export interface TVShow {
  id: string
  name: string
  path: string
  metadata_json?: string
}

export interface Season {
  id: string
  name: string
  seasonNumber: number
  path: string
}

export interface Episode {
  id: string
  name: string
  episodeNumber: number
  path: string
  fileSize?: number
  metadata_json?: string
}

// Books
export interface Book {
  id: string
  name: string
  path: string
  fileSize?: number
}

// =============================================================================
// API List Response Types
// =============================================================================

export interface MoviesResponse {
  movies: Movie[]
  total: number
  message?: string
}

export interface TVShowsResponse {
  shows: TVShow[]
  total: number
  message?: string
}

export interface BooksResponse {
  books: Book[]
  total: number
  message?: string
}

// =============================================================================
// Scan Types
// =============================================================================

export interface ScanResult {
  success: boolean
  added: number
  updated: number
  errors?: number
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
