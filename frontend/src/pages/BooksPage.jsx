import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Plus, Search, SearchX, X } from 'lucide-react';
import { booksApi } from '../api/books.js';
import { useApi } from '../lib/useApi.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { pluralize } from '../lib/format.js';
import { STATUSES, isValidStatus } from '../lib/status.js';
import {
  Alert,
  Button,
  ChoiceChips,
  EmptyState,
  PageHeader,
  Spinner,
  STATUS_DOT_COLORS,
} from '../components/ui/index.js';
import { BookCard, BookCardSkeleton } from '../components/books/BookCard.jsx';

const DEBOUNCE_MS = 300;

export function BooksPage() {
  useDocumentTitle('My Books');
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const rawStatus = searchParams.get('status') ?? '';
  const status = isValidStatus(rawStatus) ? rawStatus : '';

  // The text box updates instantly; the URL (and therefore the request) follows after a pause.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    if (searchInput === search) return undefined;
    const timer = setTimeout(() => updateParams({ search: searchInput }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  // Counts for the filter chips come from the unfiltered list so they stay stable.
  const totals = useApi(() => booksApi.stats(), []);
  const { data: books, error, loading, refreshing, retry } = useApi(
    () => booksApi.list({ search, status }),
    [search, status],
  );

  const chipOptions = useMemo(() => {
    const t = totals.data;
    return [
      { value: '', label: 'All', count: t?.total },
      ...STATUSES.map((s) => ({
        ...s,
        dotColor: STATUS_DOT_COLORS[s.value],
        count: t?.[{ want_to_read: 'wantToRead', reading: 'reading', finished: 'finished' }[s.value]],
      })),
    ];
  }, [totals.data]);

  const hasFilters = Boolean(search || status);
  const total = totals.data?.total;

  return (
    <>
      <PageHeader
        title="My Books"
        subtitle={total !== undefined ? `${pluralize(total, 'book')} in your library` : undefined}
        actions={
          <Button to="/books/new" icon={Plus}>
            Add book
          </Button>
        }
      />

      <div className="toolbar" role="search">
        <div className="input-wrap input-wrap--leading toolbar__search">
          <Search className="input-wrap__icon" aria-hidden="true" />
          <input
            type="search"
            className="input"
            placeholder="Search by title or author…"
            aria-label="Search by title or author"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') updateParams({ search: searchInput });
              if (e.key === 'Escape') {
                setSearchInput('');
                updateParams({ search: '' });
              }
            }}
          />
          {searchInput && (
            <button
              type="button"
              className="input-wrap__action"
              aria-label="Clear search"
              onClick={() => {
                setSearchInput('');
                updateParams({ search: '' });
              }}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="toolbar__filters">
          <ChoiceChips
            label="Filter by status"
            options={chipOptions}
            value={status}
            onChange={(value) => updateParams({ status: value })}
          />
        </div>
      </div>

      <p className="results-summary" aria-live="polite">
        {refreshing && <Spinner label="Updating results" />}
        {books && hasFilters && total !== undefined && `Showing ${books.length} of ${pluralize(total, 'book')}`}
      </p>

      {error ? (
        <Alert type="error" onRetry={retry}>
          Couldn't load your books. {error.message}
        </Alert>
      ) : loading ? (
        <div className="books-grid" aria-busy="true" aria-label="Loading books">
          {Array.from({ length: 6 }, (_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : books.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No books match"
            description={
              search
                ? `Nothing in your library matches "${search}"${status ? ' with this status' : ''}.`
                : 'You have no books with this status yet.'
            }
            actions={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchInput('');
                  setSearchParams({}, { replace: true });
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Your library is empty"
            description="Add the first book you want to keep track of."
            actions={
              <Button to="/books/new" icon={Plus}>
                Add your first book
              </Button>
            }
          />
        )
      ) : (
        <div className={`books-grid ${refreshing ? 'books-grid--refreshing' : ''}`.trim()} aria-busy={refreshing}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </>
  );
}
