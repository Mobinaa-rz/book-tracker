import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { Button } from './Button.jsx';

const ICONS = { error: CircleAlert, info: Info, success: CircleCheck };

/** Inline message box. Pass `onRetry` to show a "Try again" button. */
export function Alert({ type = 'error', children, onRetry, retryLabel = 'Try again' }) {
  const Icon = ICONS[type] ?? Info;
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <div className="alert__body">
        <span>{children}</span>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
