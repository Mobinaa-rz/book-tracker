import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Button } from '../components/ui/index.js';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  const { user } = useAuth();

  return (
    <div className="not-found">
      <p className="not-found__code" aria-hidden="true">
        404
      </p>
      <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>
        Page not found
      </h1>
      <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
        The page you're looking for doesn't exist.
      </p>
      <Button to={user ? '/' : '/login'} variant="secondary">
        {user ? 'Go to Dashboard' : 'Go to Log in'}
      </Button>
    </div>
  );
}
