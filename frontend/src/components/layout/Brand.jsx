import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand" aria-label="Book Tracker home">
      <span className="brand__mark">
        <BookOpen aria-hidden="true" />
      </span>
      Book Tracker
    </Link>
  );
}
