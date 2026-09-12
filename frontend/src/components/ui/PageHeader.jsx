import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/** Page title block with optional subtitle, back link and action buttons. */
export function PageHeader({ title, subtitle, backTo, backLabel = 'Back', actions }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {backTo && (
          <div className="page-header__eyebrow">
            <Link to={backTo} className="back-link">
              <ArrowLeft aria-hidden="true" />
              {backLabel}
            </Link>
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
