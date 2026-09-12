import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUSES } from '../../lib/status.js';
import { Button } from '../ui/Button.jsx';
import { Field, Input, Textarea } from '../ui/Field.jsx';
import { ChoiceChips } from '../ui/ChoiceChips.jsx';
import { STATUS_DOT_COLORS } from '../ui/StatusBadge.jsx';
import { StarRatingInput } from '../ui/StarRating.jsx';
import { Alert } from '../ui/Alert.jsx';

const LIMITS = { title: 200, author: 200, notes: 2000 };

const EMPTY = { title: '', author: '', status: 'want_to_read', rating: null, notes: '' };

const STATUS_OPTIONS = STATUSES.map((s) => ({ ...s, dotColor: STATUS_DOT_COLORS[s.value] }));

/** Client-side checks that mirror the API's validation rules. */
export function validateBook(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  else if (values.title.trim().length > LIMITS.title) errors.title = `Title must be at most ${LIMITS.title} characters`;
  if (!values.author.trim()) errors.author = 'Author is required';
  else if (values.author.trim().length > LIMITS.author) errors.author = `Author must be at most ${LIMITS.author} characters`;
  if (values.notes.length > LIMITS.notes) errors.notes = `Notes must be at most ${LIMITS.notes} characters`;
  return errors;
}

/**
 * Shared form for Add Book and Edit Book.
 * `onSubmit` receives the cleaned payload and should return a promise;
 * an ApiError with `details` is mapped back onto the fields.
 */
export function BookForm({ initialValues, onSubmit, submitLabel, submittingLabel, cancelTo }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    const next = { ...values, [field]: value };
    setValues(next);
    // After the first submit attempt, re-validate live so errors clear as the user types.
    if (submitted) setErrors(validateBook(next));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setSubmitted(true);
    setFormError(null);
    const clientErrors = validateBook(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      document.getElementById(Object.keys(clientErrors)[0])?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        author: values.author.trim(),
        status: values.status,
        rating: values.rating ?? null,
        notes: values.notes.trim(),
      });
    } catch (error) {
      if (error.details) setErrors(error.details);
      setFormError(error.details ? null : error.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  const notesOver = values.notes.length > LIMITS.notes;

  return (
    <form className="card form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        {formError && <Alert type="error">{formError}</Alert>}

        <Field label="Title" required error={errors.title} id="title">
          {(props) => (
            <Input
              {...props}
              value={values.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. The Left Hand of Darkness"
              autoComplete="off"
              autoFocus={!initialValues}
              maxLength={LIMITS.title + 1}
            />
          )}
        </Field>

        <Field label="Author" required error={errors.author} id="author">
          {(props) => (
            <Input
              {...props}
              value={values.author}
              onChange={(e) => update('author', e.target.value)}
              placeholder="e.g. Ursula K. Le Guin"
              autoComplete="off"
              maxLength={LIMITS.author + 1}
            />
          )}
        </Field>

        <Field label="Status" error={errors.status} id="status">
          {(props) => (
            <ChoiceChips
              {...props}
              label="Status"
              options={STATUS_OPTIONS}
              value={values.status}
              onChange={(value) => update('status', value)}
            />
          )}
        </Field>

        <Field label="Rating" hint="Optional — click a star again to clear it" error={errors.rating} id="rating">
          {(props) => (
            <StarRatingInput {...props} value={values.rating} onChange={(value) => update('rating', value)} />
          )}
        </Field>

        <Field
          label="Notes"
          error={errors.notes}
          id="notes"
          footer={
            <span className={`char-count ${notesOver ? 'char-count--over' : ''}`.trim()} aria-live="polite">
              {values.notes.length} / {LIMITS.notes}
            </span>
          }
        >
          {(props) => (
            <Textarea
              {...props}
              value={values.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Your thoughts, favourite quotes, where you left off…"
              rows={5}
            />
          )}
        </Field>
      </div>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => navigate(cancelTo)} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} loadingText={submittingLabel}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
