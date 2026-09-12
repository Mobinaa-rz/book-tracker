import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.jsx';

/** Shell for all logged-in pages: sticky navbar + centered main content. */
export function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main" id="main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
