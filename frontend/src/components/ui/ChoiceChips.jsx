import { useId } from 'react';

/**
 * Single-select pill group (behaves like radio buttons).
 * options: [{ value, label, dotColor?, count? }]
 */
export function ChoiceChips({ label, options, value, onChange, id: providedId }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  function handleKeyDown(event, index) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const delta = keys[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
    document.getElementById(`${id}-${next.value}`)?.focus();
  }

  return (
    <div className="chips" role="radiogroup" aria-label={label} id={id}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            id={`${id}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="chip"
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.dotColor && (
              <span className="chip__dot" style={{ background: option.dotColor }} aria-hidden="true" />
            )}
            {option.label}
            {option.count !== undefined && <span className="chip__count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
