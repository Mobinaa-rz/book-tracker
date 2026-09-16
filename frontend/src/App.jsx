import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { AuthLayout } from './components/layout/AuthLayout.jsx';
import { GuestRoute, ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { BooksPage } from './pages/BooksPage.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { AddBookPage } from './pages/AddBookPage.jsx';
import { EditBookPage } from './pages/EditBookPage.jsx';
import { BookDetailsPage } from './pages/BookDetailsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export function App() {
  return (
    <Routes>
      {/* Public: login & register (redirect to dashboard when already logged in) */}
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Private: everything else. Guests are redirected to /login. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/books/new" element={<AddBookPage />} />
          <Route path="/books/:id" element={<BookDetailsPage />} />
          <Route path="/books/:id/edit" element={<EditBookPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
