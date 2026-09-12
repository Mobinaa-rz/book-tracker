import { Outlet } from 'react-router-dom';
import { BookCover } from '../books/BookCover.jsx';
import { Brand } from './Brand.jsx';

const SHELF = ['Dune', 'Piranesi', 'The Hobbit'];

/**
 * Layout for Login / Register: a centered card, and on large screens a
 * quiet ink-coloured side panel with a small "shelf" of cover placeholders.
 */
export function AuthLayout() {
  return (
    <div className="auth-layout">
      <aside className="auth-side" aria-hidden="true">
        <Brand to="/login" />
        <div className="auth-side__body">
          <h2 className="auth-side__title">Keep track of every book you read.</h2>
          <p className="auth-side__text">
            Your reading list, your progress and your thoughts — all in one calm place.
          </p>
        </div>
        <div>
          <div className="auth-side__shelf">
            {SHELF.map((title) => (
              <BookCover key={title} title={title} size="md" />
            ))}
          </div>
          <p className="auth-side__footer" style={{ marginTop: '1rem' }}>
            Want to Read · Reading · Finished
          </p>
        </div>
      </aside>

      <div className="auth-content">
        <Brand to="/login" />
        <Outlet />
      </div>
    </div>
  );
}
