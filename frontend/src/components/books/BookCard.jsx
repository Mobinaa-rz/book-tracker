import { Link } from 'react-router-dom';
import { StickyNote } from 'lucide-react';
import { formatDate } from '../../lib/format.js';
import { StatusBadge } from '../ui/StatusBadge.jsx';
import { StarRating } from '../ui/StarRating.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { BookCover } from './BookCover.jsx';

/** Card shown in the My Books grid. The whole card links to the details page. */
export function BookCard({ book }) {
  return (
    <Link to={`/books/${book.id}`} className="card book-card" aria-label={`${book.title} by ${book.author}`}>
      <div className="book-card__body">
        <BookCover title={book.title} size="md" className="book-card__cover" />
        <div className="book-card__info">
          <div>
            <StatusBadge status={book.status} />
          </div>
          <h3 className="book-card__title">{book.title}</h3>
          <p className="book-card__author">{book.author}</p>
          {book.rating ? (
            <div className="book-card__rating">
              <StarRating value={book.rating} showValue={false} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="book-card__footer">
        <span className="tabular">Added {formatDate(book.created_at)}</span>
        {book.notes && (
          <span className="book-card__notes-flag" title="Has notes">
            <StickyNote aria-hidden="true" />
            Notes
          </span>
        )}
      </div>
    </Link>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="card book-card book-card--skeleton" aria-hidden="true">
      <div className="book-card__body">
        <Skeleton className="skeleton-cover" />
        <div className="book-card__info">
          <Skeleton width="5rem" height="1.5rem" style={{ borderRadius: '9999px' }} />
          <Skeleton variant="title" width="80%" />
          <Skeleton variant="text" width="55%" />
          <Skeleton variant="text" width="40%" style={{ marginTop: 'auto' }} />
        </div>
      </div>
      <div className="book-card__footer">
        <Skeleton variant="text" width="7rem" />
      </div>
    </div>
  );
}
