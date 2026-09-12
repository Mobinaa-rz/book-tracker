import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../ui/Skeleton.jsx';

/** Renders child routes only when logged in; otherwise sends the user to /login. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    // Remember where the user wanted to go so we can return them after login.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

/** The opposite: login/register are only for logged-out visitors. */
export function GuestRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  // Already logged in: go to the page they originally asked for, or the dashboard.
  // (Uses the same `state.from` as LoginPage so both redirects agree.)
  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  return <Outlet />;
}
