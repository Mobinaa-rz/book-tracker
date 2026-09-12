import { useState } from 'react';
import { Star } from 'lucide-react';

const MAX = 5;

/**
 * Read-only stars with a numeric label ("4/5"), or "Not rated" when null.
 */
export function StarRating({ value, size = 'sm', showValue = true, className = '' }) {
  if (!value) {
    return <span className={`stars__empty ${className}`.trim()}>Not rated</span>;
  }

  return (
    <span
      className={`stars stars--${size} ${className}`.trim()}
      role="img"
      aria-label={`Rated ${value} out of ${MAX}`}
    >
      <span className="stars__list" aria-hidden="true">
        {Array.from({ length: MAX }, (_, i) => (
          <span key={i} className={`stars__star ${i < value ? 'stars__star--filled' : ''}`.trim()}>
            <Star />
          </span>
        ))}
      </span>
      {showValue && (
        <span className="stars__value" aria-hidden="true">
          {value}/{MAX}
        </span>
      )}
    </span>
  );
}

/**
 * Interactive star picker for forms.
 * - Click a star to set the rating; click the same star again to clear it.
 * - Arrow keys change the value, Backspace/Delete clears it.
 */
export function StarRatingInput({ value, onChange, id, ...ariaProps }) {
  const [preview, setPreview] = useState(null);
  const shown = preview ?? value ?? 0;

  function handleKeyDown(event) {
    let next = value ?? 0;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(MAX, next + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, next - 1);
    else if (event.key === 'Backspace' || event.key === 'Delete') next = 0;
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = MAX;
    else return;
    event.preventDefault();
    onChange(next || null);
  }

  return (
    <div className="stars stars--md stars--interactive">
      <div
        id={id}
        className="stars__list"
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={value ?? 0}
        aria-valuetext={value ? `${value} out of ${MAX} stars` : 'Not rated'}
        aria-label="Rating"
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setPreview(null)}
        {...ariaProps}
      >
        {Array.from({ length: MAX }, (_, i) => {
          const starValue = i + 1;
          const filled = value != null && starValue <= value;
          const previewed = preview != null && starValue <= preview;
          return (
            <button
              key={starValue}
              type="button"
              tabIndex={-1}
              className={[
                'stars__star',
                filled && 'stars__star--filled',
                !filled && previewed && 'stars__star--preview',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`Rate ${starValue} of ${MAX}`}
              onMouseEnter={() => setPreview(starValue)}
              onFocus={() => setPreview(starValue)}
              onClick={() => onChange(starValue === value ? null : starValue)}
            >
              <Star aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {value ? (
        <button type="button" className="stars__clear" onClick={() => onChange(null)}>
          Clear
        </button>
      ) : (
        <span className="stars__empty">{shown ? `${shown}/${MAX}` : 'Not rated'}</span>
      )}
    </div>
  );
}
