# Series Population Plan

## Current State

- Books have metadata that includes `series` name and `series_position` from Hardcover API
- Filesystem structure organizes books as:
  - Organized: `Author/SeriesName/BookTitle/` → auto-detected and linked
  - Unorganized: `Author/BookTitle/` → standalone, but may have series metadata

## Goal

Populate `book_series` and link books to series based on metadata, handling both filesystem hierarchy and metadata hints.

## Three-Phase Approach

### Phase 1: Scan & Detect Series (Already Implemented)

When scanner runs:

- Detects filesystem hierarchy (Author/SeriesName/BookTitle)
- Creates series records for structured folders
- Creates standalone book records for loose books

### Phase 2: Enrich with Metadata (Next)

When we fetch book metadata from Hardcover:

1. **Store series metadata**: Extract `series` and `series_position` from API response
2. **Link to existing series**: If metadata series matches existing series by name, link the book
3. **Create missing series**: If metadata indicates a series that doesn't exist, create it
4. **Update standalone books**: If a standalone book has series metadata, optionally:
   - Auto-link to series if series exists
   - Flag for manual review if unsure

### Phase 3: User Interface for Series Management

Show users:

- Books with suggested series links (metadata says series, but not linked)
- Standalone books that could join series
- Series organization status

## Implementation Details

### Auto-Link Rules

When fetching metadata for a book:

```
book.series (from metadata) + author → find or create book_series record
↓
Link book.series_id to that record
```

### Metadata-Driven Series Creation

```typescript
// In searchBook or metadata fetch:
if (bookMetadata.series && !book.series_id) {
  // Find or create series
  const seriesRecord = await getSeriesByAuthorAndName(
    book.author_id,
    bookMetadata.series
  );
  if (!seriesRecord) {
    // Create new series
    await insertSeries({
      author_id: book.author_id,
      name: bookMetadata.series,
      created_at: Date.now(),
      last_scanned: Date.now(),
    });
  }
  // Link book
  await updateBook({
    ...book,
    series_id: seriesRecord.id,
    last_scanned: Date.now(),
  });
}
```

### Conflict Resolution

If filesystem hierarchy ≠ metadata series:

- Filesystem takes precedence (we've explicitly organized it)
- Log discrepancies for review
- User can manually override in UI

## Data Flow

```
1. Scanner detects filesystem structure
   ↓ Creates authors, series, books, links them

2. UI requests metadata fetch for book
   ↓ Backend fetches from Hardcover

3. Backend receives series info in metadata
   ↓ Links book to series (creating series if needed)

4. UI displays book with series info
   ↓ User can see where book belongs
```

## Next Steps

1. **Extend updateBook** to accept series_id updates
2. **Modify searchBook** to return series info
3. **Add series linking logic** in POST /api/books/:bookId/metadata
4. **Build UI component** for "Suggested series" (Phase 3)
5. **Add bulk metadata fetch** to populate all books

## Example Scenarios

### Scenario A: Filesystem Organized

```
File: /audiobooks/Brandon Sanderson/Mistborn/The Final Empire/
Scanner: Creates series "Mistborn", book "The Final Empire", links them
Metadata: Returns series="Mistborn", series_position=1
Result: Everything aligns ✓
```

### Scenario B: Metadata-Only Series

```
File: /ebooks/N.K. Jemisin/The Fifth Season/
Scanner: Creates standalone book (no series folder)
Metadata: Returns series="Broken Earth", series_position=1
Result: Link book to "Broken Earth" series (auto-created)
```

### Scenario C: Mismatch (Rare)

```
File: /audiobooks/Neil Gaiman/Norse Mythology/
Filesystem: Standalone
Metadata: series="Norse Mythology Collection" (hypothetical)
Result: Filesystem wins, log discrepancy for review
```

## Benefits

- Unified series data from both structure and metadata
- Automatic population without manual work
- Handles both organized and unorganized libraries
- Foundation for series browsing, recommendations, reading order
