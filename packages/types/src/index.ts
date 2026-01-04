// Base media types
export interface MediaItem {
  id: string
  title: string
  type: MediaType
  createdAt: string
  updatedAt: string
}

export enum MediaType {
  BOOK = 'book',
  MOVIE = 'movie',
  SHOW = 'show',
  MUSIC = 'music',
}

// Book-specific types
export interface Book extends MediaItem {
  type: MediaType.BOOK
  author: string
  isbn?: string
  pages?: number
  status: ReadingStatus
}

export enum ReadingStatus {
  TO_READ = 'to_read',
  READING = 'reading',
  COMPLETED = 'completed',
  DNF = 'dnf', // Did Not Finish
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface HealthResponse {
  status: string
  service: string
}