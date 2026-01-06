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

// Book Metadata
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

// Authors
export interface Author {
  id: number
  name: string
  bookCount: number
  seriesCount: number
  imageUrl?: string | null
  metadata?: {
    image_url?: string | null
    description?: string | null
  } | null
}

// Series
export interface BookSeries {
  id: number
  name: string
  bookCount: number
  authorName: string
  coverUrl?: string | null
}

// Books (NEW hierarchical structure)
export interface Book {
  id: string
  title: string
  type: 'audiobook' | 'ebook'
  path: string
  fileSize?: number
  coverUrl?: string | null
  metadata?: BookMetadata | null
  author?: {
    id: number
    name: string
  }
  series?: {
    id: number
    name: string
  } | null
}

// Legacy Book (for backwards compatibility during migration)
export interface LegacyBook {
  id: string
  name: string
  path: string
  fileSize?: number
  type?: 'audiobook' | 'ebook'
  coverUrl?: string | null
  metadata?: BookMetadata | null
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

export interface AuthorsResponse {
  authors: Author[]
  total: number
}

export interface SeriesResponse {
  series: BookSeries[]
  total: number
}

export interface SeriesBooksResponse {
  books: Book[]
  total: number
  seriesName: string
  authorName: string
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
