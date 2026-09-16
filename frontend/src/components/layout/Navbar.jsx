import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, Library, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Brand } from './Brand.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/books', label: 'My Books', icon: Library, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/books/new', label: 'Add Book', icon: Plus },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not log out. Please try again.');
      setLoggingOut(false);
    }
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Brand />

        <nav className="nav-links" aria-label="Main">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-user">
          <span className="nav-user__name" title={user.username}>
            <span className="avatar" aria-hidden="true">
              {user.username.charAt(0)}
            </span>
            <span className="nav-user__label">{user.username}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={LogOut}
            onClick={handleLogout}
            loading={loggingOut}
            aria-label="Log out"
            title="Log out"
          >
            <span className="nav-logout-label">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
