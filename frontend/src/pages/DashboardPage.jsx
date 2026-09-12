import { Link } from 'react-router-dom';
import { ArrowRight, BookCheck, BookMarked, BookOpen, Library, Plus } from 'lucide-react';
import { booksApi } from '../api/books.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../lib/useApi.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Alert, Button, EmptyState, PageHeader, Skeleton } from '../components/ui/index.js';
import { BookListItem, BookListItemSkeleton } from '../components/books/BookListItem.jsx';

const STATS = [
  { key: 'total', label: 'Total books', icon: Library, to: '/books' },
  { key: 'wantToRead', label: 'Want to Read', icon: BookMarked, to: '/books?status=want_to_read', status: 'want_to_read' },
  { key: 'reading', label: 'Reading', icon: BookOpen, to: '/books?status=reading', status: 'reading' },
  { key: 'finished', label: 'Finished', icon: BookCheck, to: '/books?status=finished', status: 'finished' },
];

function StatCard({ label, value, icon: Icon, to, status }) {
  return (
    <Link to={to} className="card stat-card" aria-label={`${label}: ${value}. View these books`}>
      <span className={`stat-card__icon stat-card__icon--${status ?? 'total'}`}>
        <Icon aria-hidden="true" />
      </span>
      <span>
        <span className="stat-card__label" style={{ display: 'block' }}>
          {label}
        </span>
        <span className="stat-card__value" style={{ display: 'block' }}>
          {value}
        </span>
      </span>
    </Link>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card stat-card" aria-hidden="true">
      <Skeleton width="2.75rem" height="2.75rem" style={{ borderRadius: 10, flexShrink: 0 }} />
      <span className="stack" style={{ gap: '0.5rem' }}>
        <Skeleton variant="text" width="5.5rem" />
        <Skeleton width="3rem" height="1.75rem" />
      </span>
    </div>
  );
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { data: stats, error, loading, retry } = useApi(() => booksApi.stats(), []);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.username}`}
        subtitle="Here's an overview of your library."
        actions={
          <Button to="/books/new" icon={Plus}>
            Add book
          </Button>
        }
      />

      {error ? (
        <Alert type="error" onRetry={retry}>
          Couldn't load your dashboard. {error.message}
        </Alert>
      ) : (
        <>
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">
              Summary
            </h2>
            <div className="stats-grid">
              {loading
                ? STATS.map((s) => <StatCardSkeleton key={s.key} />)
                : STATS.map(({ key, ...stat }) => <StatCard key={key} {...stat} value={stats[key]} />)}
            </div>
          </section>

          <section className="section" aria-labelledby="recent-heading">
            <div className="section__header">
              <h2 id="recent-heading" className="section__title">
                Recently added
              </h2>
              {!loading && stats.total > 0 && (
                <Link to="/books" className="section__link">
                  View all
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="card book-list">
                {[0, 1, 2].map((i) => (
                  <BookListItemSkeleton key={i} />
                ))}
              </div>
            ) : stats.recent.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Start your library"
                description="Add the book you're reading right now, or one you've been meaning to pick up."
                actions={
                  <Button to="/books/new" icon={Plus}>
                    Add your first book
                  </Button>
                }
              />
            ) : (
              <div className="card book-list">
                {stats.recent.map((book) => (
                  <BookListItem key={book.id} book={book} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
