import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/format.js';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { BookCover } from './BookCover.jsx';

/** Compact row used in the dashboard's "Recently added" list. */
export function BookListItem({ book }) {
  return (
    <Link to={`/books/${book.id}`} className="book-row">
      <BookCover title={book.title} size="sm" />
      <div style={{ minWidth: 0 }}>
        <p className="book-row__title">{book.title}</p>
        <p className="book-row__author">{book.author}</p>
      </div>
      <div className="book-row__meta">
        <StatusBadge status={book.status} />
        <span className="book-row__date">{formatDate(book.created_at)}</span>
      </div>
    </Link>
  );
}

export function BookListItemSkeleton() {
  return (
    <div className="book-row" aria-hidden="true">
      <Skeleton width="2.5rem" height="3.75rem" style={{ borderRadius: 3 }} />
      <div className="stack" style={{ gap: '0.5rem' }}>
        <Skeleton variant="title" width="45%" />
        <Skeleton variant="text" width="30%" />
      </div>
      <Skeleton width="5rem" height="1.5rem" style={{ borderRadius: '9999px' }} />
    </div>
  );
}
