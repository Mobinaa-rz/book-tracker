import { useNavigate, useParams } from 'react-router-dom';
import { BookX } from 'lucide-react';
import { booksApi } from '../api/books.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../lib/useApi.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Alert, Button, EmptyState, PageHeader, Skeleton } from '../components/ui/index.js';
import { BookForm } from '../components/books/BookForm.jsx';

function FormSkeleton() {
  return (
    <div className="card form-card" aria-hidden="true">
      <div className="form-grid">
        {[0, 1].map((i) => (
          <div key={i} className="stack" style={{ gap: '0.5rem' }}>
            <Skeleton variant="text" width="4rem" />
            <Skeleton height="2.5rem" />
          </div>
        ))}
        <div className="stack" style={{ gap: '0.5rem' }}>
          <Skeleton variant="text" width="4rem" />
          <Skeleton height="2.25rem" width="60%" style={{ borderRadius: 9999 }} />
        </div>
        <div className="stack" style={{ gap: '0.5rem' }}>
          <Skeleton variant="text" width="4rem" />
          <Skeleton height="7.5rem" />
        </div>
      </div>
    </div>
  );
}

export function EditBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: book, error, loading, retry } = useApi(() => booksApi.get(id), [id]);

  useDocumentTitle(book ? `Edit ${book.title}` : 'Edit Book');

  async function handleSubmit(payload) {
    await booksApi.update(id, payload);
    toast.success('Changes saved');
    navigate(`/books/${id}`, { replace: true });
  }

  const backTo = book ? `/books/${id}` : '/books';

  return (
    <div className="container--narrow" style={{ marginInline: 'auto' }}>
      <PageHeader
        title="Edit book"
        subtitle={book ? `Update the details for “${book.title}”.` : undefined}
        backTo={backTo}
        backLabel={book ? 'Back to book' : 'My Books'}
      />

      {loading ? (
        <FormSkeleton />
      ) : error?.status === 404 ? (
        <EmptyState
          icon={BookX}
          title="Book not found"
          description="This book doesn't exist or may have been deleted."
          actions={
            <Button variant="secondary" to="/books">
              Back to My Books
            </Button>
          }
        />
      ) : error ? (
        <Alert type="error" onRetry={retry}>
          Couldn't load this book. {error.message}
        </Alert>
      ) : (
        <BookForm
          initialValues={{
            title: book.title,
            author: book.author,
            status: book.status,
            rating: book.rating,
            notes: book.notes,
          }}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          cancelTo={backTo}
        />
      )}
    </div>
  );
}
