// Re-export shared types from the types package
export type {
  // Metadata types
  MovieMetadata,
  TVShowMetadata,
  EpisodeMetadata,

  // API Response types
  MovieResponse,
  TVShowResponse,
  SeasonResponse,
  EpisodeResponse,
  BookResponse,
  MoviesListResponse,
  TVShowsListResponse,
  SeasonsListResponse,
  EpisodesListResponse,
  BooksListResponse,
  ScanResponse,
  MediaStats,
  ApiConnectionTestResult,
  ApiConnectionsResponse,
} from '@simple-media/types'

// Aliases for backwards compatibility with existing component code
// These match what the API actually returns
export type Movie = import('@simple-media/types').MovieResponse
export type TVShow = import('@simple-media/types').TVShowResponse
export type Season = import('@simple-media/types').SeasonResponse
export type Episode = import('@simple-media/types').EpisodeResponse
export type Book = import('@simple-media/types').BookResponse
export type MoviesResponse = import('@simple-media/types').MoviesListResponse
export type TVShowsResponse = import('@simple-media/types').TVShowsListResponse
export type BooksResponse = import('@simple-media/types').BooksListResponse
export type ScanResult = import('@simple-media/types').ScanResponse
