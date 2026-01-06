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

export interface AuthorMetadata {
  image_url?: string | null
  description?: string | null
}

export async function fetchAuthorImage(name: string): Promise<AuthorMetadata | null> {
  if (!HARDCOVER_API_KEY) {
    return null
  }

  try {
    const query = `
      query SearchAuthors($query: String!, $perPage: Int!) {
        search(
          query: $query,
          query_type: "Author",
          fields: "name",
          weights: "5",
          per_page: $perPage
        ) {
          results
        }
      }
    `

    const response = await rateLimitedGraphQLFetch(query, 'SearchAuthors', {
      query: name,
      perPage: 5
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json() as any
    if (result.errors || !result.data?.search?.results?.hits?.length) {
      return null
    }

    const hits = result.data.search.results.hits
    const exact = hits.find((hit: any) => hit.document?.name?.toLowerCase() === name.toLowerCase()) || hits[0]
    const doc = exact.document

    return {
      image_url: doc?.image?.url || doc?.portrait_image_url || doc?.photo_url || null,
      description: doc?.bio || null
    }
  } catch (error) {
    console.error('Error searching Hardcover authors:', error)
    return null
  }
}

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
          fields: "title,alternative_titles,author_names", 
          weights: "5,1,3", 
          per_page: $perPage
        ) {
          results
        }
      }
    `
    
    console.log(`Searching Hardcover for: "${searchQuery}"${author ? ` (filtering by author: "${author}")` : ''}`)
    
    const response = await rateLimitedGraphQLFetch(query, 'SearchBooks', { 
      query: searchQuery,
      perPage: 10
    })
    
    console.log('[Hardcover Search] Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Hardcover Search] API error ${response.status}:`, errorText)
      return null
    }

    const result = await response.json() as any
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return null
    }
    
    if (!result.data?.search?.results?.hits || result.data.search.results.hits.length === 0) {
      console.log(`No results found for: "${searchQuery}"`)
      return null
    }

    // If author was provided, find the best matching result
    let book = null
    if (author) {
      const hits = result.data.search.results.hits
      console.log(`Looking for book by author: "${author}" (found ${hits.length} results)`)
      
      // Filter out supplementary materials
      const supplementaryKeywords = ['annotation', 'study guide', 'summary', 'analysis', 'companion', 'notes', 'overview', 'recap']
      const collectionKeywords = ['trilogy', 'collection', 'boxset', 'box set', 'omnibus', 'complete', 'series bundle']
      
      // Extract meaningful words from the search title (ignore common words)
      const searchTitleWords = title.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'book', 'vol', 'part'].includes(w))
      
      let candidates = []
      
      for (const hit of hits) {
        const bookAuthors = hit.document.author_names || []
        const bookTitle = hit.document.title.toLowerCase()
        
        // Check if title contains supplementary keywords
        const isSupplementary = supplementaryKeywords.some(keyword => bookTitle.includes(keyword))
        
        if (isSupplementary) {
          console.log(`  Result: "${hit.document.title}" by [${bookAuthors.join(', ')}] (supplementary - skipping)`)
          continue
        }
        
        // Check if any of the book's authors match
        const authorMatch = bookAuthors.some((bookAuthor: string) => {
          const authorLower = author.toLowerCase()
          const bookAuthorLower = bookAuthor.toLowerCase()
          return authorLower.includes(bookAuthorLower) || bookAuthorLower.includes(authorLower)
        })
        
        if (!authorMatch) {
          continue
        }
        
        // Score this candidate
        const bookTitleWords = bookTitle.replace(/[^\w\s]/g, ' ').split(/\s+/)
        const wordOverlap = searchTitleWords.filter(w => bookTitleWords.includes(w)).length
        const isCollection = collectionKeywords.some(keyword => bookTitle.includes(keyword))
        
        // Check for very close title match (most words match)
        const titleMatchRatio = searchTitleWords.length > 0 ? wordOverlap / searchTitleWords.length : 0
        const isCloseMatch = titleMatchRatio >= 0.7
        
        // If it's a close title match, don't penalize collections as heavily
        // This handles cases like "Arcanum Unbounded" which IS a collection but is the correct match
        const collectionPenalty = isCloseMatch ? 0 : (isCollection ? 5 : 0)
        
        const score = wordOverlap - collectionPenalty
        
        candidates.push({ hit, score, isCollection, titleMatchRatio })
        console.log(`  Result: "${hit.document.title}" by [${bookAuthors.join(', ')}] (score: ${score}, match: ${(titleMatchRatio * 100).toFixed(0)}%${isCollection ? ', collection' : ''})`)
      }
      
      if (candidates.length === 0) {
        console.log(`✗ No results matched author "${author}" (excluding supplementary materials)`)
        return null
      }
      
      // Sort by score descending and pick the best
      candidates.sort((a, b) => b.score - a.score)
      book = candidates[0].hit.document
      console.log(`  → Selected: "${book.title}" by ${book.author_names.join(', ')}`)
    } else {
      // No author filter, use first result
      console.log('No author filter provided, using first result')
      book = result.data.search.results.hits[0].document
    }
    
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
      publisher: null,  // Not in search results
      language: null,   // Not in search results  
      genres: book.genres || []
    }

    console.log(`Found book: "${metadata.title}" by ${authors.join(', ')}, genres: ${metadata.genres.join(', ')}`)
    return metadata

  } catch (error) {
    console.error('Error searching Hardcover:', error)
    return null
  }
}
