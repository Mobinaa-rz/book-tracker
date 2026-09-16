import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUSES } from '../../lib/status.js';
import { useSessionExpiry } from '../../lib/useApi.js';
import { Button } from '../ui/Button.jsx';
import { Field, Input, Textarea } from '../ui/Field.jsx';
import { ChoiceChips } from '../ui/ChoiceChips.jsx';
import { STATUS_DOT_COLORS } from '../ui/StatusBadge.jsx';
import { StarRatingInput } from '../ui/StarRating.jsx';
import { Alert } from '../ui/Alert.jsx';

const LIMITS = { title: 200, author: 200, notes: 2000 };

const EMPTY = {
  title: '',
  author: '',
  status: 'want_to_read',
  rating: null,
  notes: '',
  start_date: '',
  finished_date: '',
};

/** The two calendar dates, as 'YYYY-MM-DD' strings ('' means "no date"). */
const DATE_FIELDS = ['start_date', 'finished_date'];

/**
 * The API sends `null` for a date that is not set, but `<input type="date">`
 * needs a string: a null value would make React treat the field as
 * uncontrolled and then warn when the reader types into it.
 */
function normalizeDates(values) {
  const next = { ...values };
  for (const field of DATE_FIELDS) {
    if (next[field] === null || next[field] === undefined) next[field] = '';
  }
  return next;
}

const STATUS_OPTIONS = STATUSES.map((s) => ({ ...s, dotColor: STATUS_DOT_COLORS[s.value] }));

/** Client-side checks that mirror the API's validation rules. */
export function validateBook(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  else if (values.title.trim().length > LIMITS.title) errors.title = `Title must be at most ${LIMITS.title} characters`;
  if (!values.author.trim()) errors.author = 'Author is required';
  else if (values.author.trim().length > LIMITS.author) errors.author = `Author must be at most ${LIMITS.author} characters`;
  if (values.notes.length > LIMITS.notes) errors.notes = `Notes must be at most ${LIMITS.notes} characters`;
  // 'YYYY-MM-DD' strings sort chronologically, so a text comparison is enough.
  // The wording matches the API's, so the reader sees the same message whether
  // it is caught here or by the server.
  if (values.start_date && values.finished_date && values.finished_date < values.start_date) {
    errors.finished_date = 'Finished date cannot be before the start date';
  }
  return errors;
}

/**
 * Shared form for Add Book and Edit Book.
 * `onSubmit` receives the cleaned payload and should return a promise;
 * an ApiError with `details` is mapped back onto the fields.
 */
export function BookForm({ initialValues, onSubmit, submitLabel, submittingLabel, cancelTo }) {
  const navigate = useNavigate();
  const handleSessionExpiry = useSessionExpiry();
  const [values, setValues] = useState(() => normalizeDates({ ...EMPTY, ...initialValues }));
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
        // Always sent, never omitted. PUT is a full update, so a missing field
        // takes its default rather than keeping what is stored - leaving these
        // out would silently wipe a date on every edit (as it already would for
        // rating and notes). An empty input means "no date", so it becomes null.
        start_date: values.start_date || null,
        finished_date: values.finished_date || null,
      });
    } catch (error) {
      if (handleSessionExpiry(error)) return;
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

        {/* The two calendar dates belong together, so they share a row, and the
            hints say out loud that changing the status fills them in. */}
        <div className="form-row">
          <Field
            label="Started"
            hint="Optional — filled in for you when the status becomes Reading"
            error={errors.start_date}
            id="start_date"
          >
            {(props) => (
              <Input
                {...props}
                type="date"
                value={values.start_date}
                onChange={(e) => update('start_date', e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Finished"
            hint="Optional — filled in for you when the status becomes Finished"
            error={errors.finished_date}
            id="finished_date"
          >
            {(props) => (
              <Input
                {...props}
                type="date"
                value={values.finished_date}
                onChange={(e) => update('finished_date', e.target.value)}
              />
            )}
          </Field>
        </div>

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
