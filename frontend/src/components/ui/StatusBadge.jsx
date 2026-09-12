import { statusLabel } from '../../lib/status.js';

/** Coloured pill with a dot and the human-readable status label. */
export function StatusBadge({ status, size = 'sm' }) {
  return (
    <span className={`badge badge--${status} ${size === 'md' ? 'badge--md' : ''}`.trim()}>
      <span className="badge__dot" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

/** CSS variable names for each status dot, used by chips. */
export const STATUS_DOT_COLORS = {
  want_to_read: 'var(--status-want-dot)',
  reading: 'var(--status-reading-dot)',
  finished: 'var(--status-finished-dot)',
};
