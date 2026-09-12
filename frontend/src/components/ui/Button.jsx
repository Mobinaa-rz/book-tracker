import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Button (or Link styled as a button when `to` is given).
 * variant: primary | secondary | ghost | danger | danger-outline
 */
export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  iconOnly = false,
  loading = false,
  loadingText,
  icon: Icon,
  to,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    block && 'btn--block',
    iconOnly && 'btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = loading ? (
    <>
      <Loader2 className="btn__spinner" aria-hidden="true" />
      {!iconOnly && (loadingText ?? children)}
    </>
  ) : (
    <>
      {Icon && <Icon aria-hidden="true" />}
      {!iconOnly && children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
