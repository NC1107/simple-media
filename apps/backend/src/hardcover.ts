import fetch from 'node-fetch'
import type { ApiConnectionTestResult } from './types.js'

const HARDCOVER_API_KEY = process.env.HARDCOVER_API_KEY
const HARDCOVER_GRAPHQL_URL = 'https://api.hardcover.app/v1/graphql'

// Rate limiting: Be conservative with API calls
const RATE_LIMIT_DELAY = 500 // milliseconds
let lastRequestTime = 0

async function rateLimitedGraphQLFetch(query: string, operationName: string, variables?: any) {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastRequestTime = Date.now()
  
  if (!HARDCOVER_API_KEY) {
    throw new Error('HARDCOVER_API_KEY not configured')
  }
  
  const requestBody = { 
    query, 
    variables,
    operationName
  }
  
  console.log('[Hardcover] Request:', {
    url: HARDCOVER_GRAPHQL_URL,
    operationName,
    variables,
    hasApiKey: !!HARDCOVER_API_KEY,
    apiKeyPrefix: HARDCOVER_API_KEY?.substring(0, 20) + '...'
  })
  
  return fetch(HARDCOVER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': HARDCOVER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
}

export async function testHardcoverConnection(): Promise<ApiConnectionTestResult> {
  if (!HARDCOVER_API_KEY) {
    return { success: false, message: 'Hardcover API key not configured' }
  }

  try {
    const query = `
      query Test {
        me {
          username
        }
      }
    `
    
    console.log('[Hardcover Test] Sending test request...')
    const response = await rateLimitedGraphQLFetch(query, 'Test')
    
    console.log('[Hardcover Test] Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json() as any
      console.log('[Hardcover Test] Response data:', JSON.stringify(data, null, 2))
      
      if (data.errors) {
        console.error('[Hardcover Test] GraphQL errors:', data.errors)
        return { success: false, message: `GraphQL error: ${data.errors[0]?.message || 'Unknown error'}` }
      }
      
      // API returns me as an array
      const username = data.data?.me?.[0]?.username
      if (username) {
        console.log('[Hardcover Test] Success! Username:', username)
        return { success: true, message: `Connected as ${username}` }
      }
      
      console.log('[Hardcover Test] No username in response')
      return { success: false, message: 'Unable to fetch user information' }
    } else if (response.status === 401) {
      console.error('[Hardcover Test] 401 Unauthorized')
      return { success: false, message: 'Invalid API key' }
    } else if (response.status === 403) {
      const errorText = await response.text()
      console.error('[Hardcover Test] 403 Forbidden. Response:', errorText)
      return { success: false, message: 'API key lacks required permissions (403)' }
    } else {
      const errorText = await response.text()
      console.error('[Hardcover Test] Error response:', errorText)
      return { success: false, message: `Hardcover API error: ${response.status}` }
    }
  } catch (error) {
    console.error('[Hardcover Test] Exception:', error)
    return { success: false, message: `Connection failed: ${error}` }
  }
}

import type { BookMetadata } from './types.js'

export type { BookMetadata }

export async function searchBook(title: string, author?: string): Promise<BookMetadata | null> {
  if (!HARDCOVER_API_KEY) {
    console.log('Hardcover API key not configured, skipping metadata fetch')
    return null
  }

  try {
    // Build search query - combine title and author
    let searchQuery = title
    if (author) {
      searchQuery += ` ${author}`
    }

    const query = `
      query SearchBooks($query: String!, $perPage: Int!) {
        search(
          query: $query, 
          query_type: "Book", 
          fields: "title,alternative_titles", 
          weights: "5,1", 
          per_page: $perPage
        ) {
          results
        }
      }
    `
    
    console.log(`Searching Hardcover for: "${searchQuery}"`)
    
    const response = await rateLimitedGraphQLFetch(query, 'SearchBooks', { 
      query: searchQuery,
      perPage: 5
    })
    
    console.log('[Hardcover Search] Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Hardcover Search] API error ${response.status}:`, errorText)
      return null
    }

    const result = await response.json() as any
    console.log('[Hardcover Search] Response data:', JSON.stringify(result, null, 2))
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return null
    }
    
    if (!result.data?.search?.results?.hits || result.data.search.results.hits.length === 0) {
      console.log(`No results found for: "${searchQuery}"`)
      return null
    }

    // Get the first result (best match by score)
    const book = result.data.search.results.hits[0].document
    
    // Extract author names
    const authors = book.author_names || []

    // Get series info from featured_series
    const featuredSeries = book.featured_series

    const metadata: BookMetadata = {
      hardcover_id: parseInt(book.id),
      title: book.title,
      subtitle: book.subtitle || null,
      description: book.description || null,
      authors: authors.length > 0 ? authors : [],
      series: featuredSeries?.series?.name || null,
      series_position: featuredSeries?.position || null,
      pages: book.pages || null,
      isbn_10: book.isbns?.[0] || null,
      isbn_13: book.isbns?.find((isbn: string) => isbn.length === 13) || null,
      release_date: book.release_date || null,
      cover_url: book.image?.url || null,
      publisher: book.publisher || null,
      language: book.language || null,
      genres: book.genres || []
    }

    console.log(`Found book: "${metadata.title}" by ${authors.join(', ')}`)
    return metadata

  } catch (error) {
    console.error('Error searching Hardcover:', error)
    return null
  }
}

export async function getBookDetails(bookId: number): Promise<BookMetadata | null> {
  if (!HARDCOVER_API_KEY) {
    console.log('Hardcover API key not configured')
    return null
  }

  try {
    const query = `
      query GetBook($id: Int!) {
        books(where: {id: {_eq: $id}}, limit: 1) {
          id
          title
          subtitle
          description
          pages
          image
          release_date
          isbn_10
          isbn_13
          contributions {
            author {
              id
              name
            }
          }
          series_books {
            series {
              id
              name
            }
            position
          }
        }
      }
    `
    
    const response = await rateLimitedGraphQLFetch(query, 'GetBook', { id: bookId })
    
    if (!response.ok) {
      console.error(`Hardcover API error: ${response.status}`)
      return null
    }

    const result = await response.json() as any
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return null
    }

    const books = result.data?.books
    if (!books || books.length === 0) {
      console.log(`Book ${bookId} not found`)
      return null
    }
    
    const book = books[0]
    
    const authors = book.contributions
      ?.map((c: any) => c.author?.name)
      .filter((name: any): name is string => !!name) || []

    const seriesBook = book.series_books?.[0]

    const metadata: BookMetadata = {
      hardcover_id: book.id,
      title: book.title,
      subtitle: book.subtitle || null,
      description: book.description || null,
      authors: authors.length > 0 ? authors : [],
      series: seriesBook?.series?.name || null,
      series_position: seriesBook?.position || null,
      pages: book.pages || null,
      isbn_10: book.isbn_10 || null,
      isbn_13: book.isbn_13 || null,
      release_date: book.release_date || null,
      cover_url: book.image || null,
      publisher: null,  // Not available in details endpoint
      language: null,    // Not available in details endpoint
      genres: []         // Not available in details endpoint
    }

    return metadata

  } catch (error) {
    console.error('Error fetching book details:', error)
    return null
  }
}
