import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { ProtectedRoute } from '../components/layout/ProtectedRoute.jsx';
import { authApi } from '../api/auth.js';

export const testUser = {
  id: 1,
  username: 'mobina',
  email: 'mobina@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
};

export const sampleBooks = [
  {
    id: 1,
    user_id: 1,
    title: 'Dune',
    author: 'Frank Herbert',
    status: 'reading',
    rating: 4,
    notes: 'Great world-building.',
    created_at: '2026-03-10T10:00:00.000Z',
    updated_at: '2026-03-10T10:00:00.000Z',
  },
  {
    id: 2,
    user_id: 1,
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    status: 'finished',
    rating: 5,
    notes: '',
    created_at: '2026-03-12T10:00:00.000Z',
    updated_at: '2026-03-12T10:00:00.000Z',
  },
];

/** Renders the current URL so tests can assert on navigation. */
export function LocationDisplay() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

/**
 * Renders `ui` inside the router and app providers.
 * - `user`: the logged-in user (null = logged out), served through the mocked authApi.me()
 * - `route`: the initial URL; `path`: the route pattern `ui` is mounted at (defaults to `route`)
 * - `protectedPage`: wrap `ui` in <ProtectedRoute>, like the real app does for logged-in pages
 * - `extraRoutes`: additional <Route> elements (e.g. redirect targets)
 */
export function renderWithProviders(
  ui,
  { user = testUser, route = '/', path, protectedPage = false, extraRoutes = null } = {},
) {
  if (user) authApi.me.mockResolvedValue(user);
  else authApi.me.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));

  const page = <Route path={path ?? route} element={ui} />;

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {protectedPage ? <Route element={<ProtectedRoute />}>{page}</Route> : page}
            {extraRoutes}
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}
