import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "My Books · Book Tracker". */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Book Tracker` : 'Book Tracker';
  }, [title]);
}
