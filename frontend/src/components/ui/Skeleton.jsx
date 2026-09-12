import { Loader2 } from 'lucide-react';

/** Grey shimmer block. Size it with `width`/`height` or the text/title modifiers. */
export function Skeleton({ width, height, variant, className = '', style }) {
  const classes = ['skeleton', variant && `skeleton--${variant}`, className].filter(Boolean).join(' ');
  return <span className={classes} style={{ width, height, ...style }} aria-hidden="true" />;
}

/** Centered spinner with an accessible label. */
export function Spinner({ label = 'Loading' }) {
  return (
    <span className="spinner" role="status" aria-label={label}>
      <Loader2 aria-hidden="true" />
    </span>
  );
}
