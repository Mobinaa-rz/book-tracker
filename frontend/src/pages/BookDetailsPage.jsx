import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookX, CalendarDays, Clock, Pencil, StickyNote, Trash2 } from 'lucide-react';
import { booksApi } from '../api/books.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi, useSessionExpiry } from '../lib/useApi.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { formatDate, timeAgo } from '../lib/format.js';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Skeleton,
  StarRating,
  StatusBadge,
} from '../components/ui/index.js';
import { BookCover } from '../components/books/BookCover.jsx';

function DetailsSkeleton() {
  return (
    <div className="detail" aria-hidden="true">
      <div className="card detail__hero">
        <Skeleton className="detail__cover" style={{ aspectRatio: '2 / 3', borderRadius: 6 }} />
        <div className="detail__info">
          <div className="stack" style={{ gap: '0.75rem' }}>
            <Skeleton height="2.25rem" width="70%" />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton width="6rem" height="1.75rem" style={{ borderRadius: 9999 }} />
          <Skeleton variant="text" width="50%" />
        </div>
      </div>
      <div className="card detail__notes">
        <Skeleton variant="text" width="4rem" style={{ marginBottom: '1rem' }} />
        <Skeleton variant="text" width="100%" style={{ marginBottom: '0.5rem' }} />
        <Skeleton variant="text" width="85%" />
      </div>
    </div>
  );
}

export function BookDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: book, error, loading, retry } = useApi(() => booksApi.get(id), [id]);
  const handleSessionExpiry = useSessionExpiry();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useDocumentTitle(book ? book.title : 'Book');

  async function handleDelete() {
    setDeleting(true);
    try {
      await booksApi.remove(id);
      toast.success('Book deleted');
      navigate('/books', { replace: true });
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setDeleting(false);
      setConfirmOpen(false);
      toast.error(err.message || 'Could not delete the book');
    }
  }

  if (error?.status === 404) {
    return (
      <>
        <PageHeader title="Book not found" backTo="/books" backLabel="My Books" />
        <EmptyState
          icon={BookX}
          title="We couldn't find that book"
          description="It may have been deleted, or the link might be wrong."
          actions={
            <Button variant="secondary" to="/books">
              Back to My Books
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={book ? book.title : 'Book details'}
        backTo="/books"
        backLabel="My Books"
        actions={
          book && (
            <>
              <Button variant="secondary" icon={Pencil} to={`/books/${id}/edit`}>
                Edit
              </Button>
              <Button variant="danger-outline" icon={Trash2} onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            </>
          )
        }
      />

      {error ? (
        <Alert type="error" onRetry={retry}>
          Couldn't load this book. {error.message}
        </Alert>
      ) : loading ? (
        <DetailsSkeleton />
      ) : (
        <div className="detail">
          <section className="card detail__hero" aria-label="Book information">
            <BookCover title={book.title} size="lg" className="detail__cover" />
            <div className="detail__info">
              <div>
                <h2 className="detail__title">{book.title}</h2>
                <p className="detail__author">by {book.author}</p>
              </div>

              <div className="detail__meta">
                <StatusBadge status={book.status} size="md" />
                <StarRating value={book.rating} size="md" />
              </div>

              <div className="detail__dates">
                <span>
                  <CalendarDays aria-hidden="true" />
                  Added {formatDate(book.created_at)}
                </span>
                {book.updated_at !== book.created_at && (
                  <span title={formatDate(book.updated_at)}>
                    <Clock aria-hidden="true" />
                    Updated {timeAgo(book.updated_at)}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="card detail__notes" aria-labelledby="notes-heading">
            <h3 id="notes-heading" className="detail__notes-title">
              <StickyNote aria-hidden="true" />
              Notes
            </h3>
            {book.notes ? (
              <p className="detail__notes-text">{book.notes}</p>
            ) : (
              <p className="detail__notes-empty">
                No notes yet.
                <Link to={`/books/${id}/edit`}>Add notes</Link>
              </p>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        danger
        title={`Delete “${book?.title ?? 'this book'}”?`}
        description="This will permanently remove the book and its notes from your library. This can't be undone."
        confirmLabel="Delete"
        confirmLoadingLabel="Deleting…"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
