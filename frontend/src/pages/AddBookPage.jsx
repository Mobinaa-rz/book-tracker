import { useNavigate } from 'react-router-dom';
import { booksApi } from '../api/books.js';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { PageHeader } from '../components/ui/index.js';
import { BookForm } from '../components/books/BookForm.jsx';

export function AddBookPage() {
  useDocumentTitle('Add Book');
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(payload) {
    const book = await booksApi.create(payload);
    toast.success('Book added');
    navigate(`/books/${book.id}`, { replace: true });
  }

  return (
    <div className="container--narrow" style={{ marginInline: 'auto' }}>
      <PageHeader
        title="Add a book"
        subtitle="Only the title and author are required — you can fill in the rest later."
        backTo="/books"
        backLabel="My Books"
      />
      <BookForm onSubmit={handleSubmit} submitLabel="Add book" submittingLabel="Adding…" cancelTo="/books" />
    </div>
  );
}
