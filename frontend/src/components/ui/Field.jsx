import { useId, useState } from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';

/**
 * Form field wrapper: label, optional hint, control, error message.
 * Wires up aria-describedby / aria-invalid for the control it renders.
 */
export function Field({ label, hint, error, required, footer, children, id: providedId }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const control = children({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? 'true' : undefined,
    'aria-required': required || undefined,
  });

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {(error || hint || footer) && (
        <div className="field__footer">
          <div>
            {error ? (
              <p className="field__error" id={errorId} role="alert">
                <CircleAlert aria-hidden="true" />
                {error}
              </p>
            ) : (
              hint && (
                <p className="field__hint" id={hintId}>
                  {hint}
                </p>
              )
            )}
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`input ${className}`.trim()} {...props} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`textarea ${className}`.trim()} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrap">
      <Input type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="input-wrap__action"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}
