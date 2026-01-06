import Authors from './Authors'

interface BooksProps {
  onBookSelect?: (bookId: string) => void
}

export default function Books({ onBookSelect }: BooksProps) {
  // Books now just renders the Authors component
  // Navigation is handled internally by Authors component
  return <Authors />
}
