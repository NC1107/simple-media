// Shared API response types
export interface ApiListResponse<T> {
  total: number
  message?: string
  [key: string]: T[] | number | string | undefined
}

// Movie types
export interface Movie {
  id: string
  name: string
  path: string
  fileSize?: number
  metadata?: MovieMetadata | null
}

export interface MovieMetadata {
  tmdb_id: number
  title: string
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

// TV Show types
export interface TVShow {
  id: string
  name: string
  path: string
  metadata_json?: string
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

export interface EpisodeMetadata {
  tvdb_id: string
  name: string
  overview: string
  aired: string
  still_url: string | null
  season_number: number
  episode_number: number
}

// Book types
export interface Book {
  id: string
  name: string
  path: string
  fileSize?: number
}

// API Response types
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

export interface ScanResult {
  success: boolean
  added: number
  updated: number
  errors?: number
}
