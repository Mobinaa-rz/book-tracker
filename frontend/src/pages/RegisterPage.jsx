import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Button, Field, Input, PasswordInput, Alert } from '../components/ui/index.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateRegistration(values) {
  const errors = {};
  const username = values.username.trim();
  if (!username) errors.username = 'Username is required';
  else if (username.length < 3) errors.username = 'Username must be at least 3 characters';
  else if (username.length > 30) errors.username = 'Username must be at most 30 characters';
  else if (!USERNAME_PATTERN.test(username)) errors.username = 'Only letters, numbers and underscores';

  if (!values.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address';

  if (!values.password) errors.password = 'Password is required';
  else if (values.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (values.password.length > 72) errors.password = 'Password must be at most 72 characters';

  return errors;
}

export function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) setErrors(validateRegistration(next));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);
    const clientErrors = validateRegistration(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await register({
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      toast.success(`Welcome, ${user.username}!`);
      navigate('/', { replace: true });
    } catch (error) {
      if (error.details) setErrors(error.details);
      else setFormError(error.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">Create your account</h1>
      <p className="auth-card__subtitle">Start keeping track of what you read.</p>

      <form onSubmit={handleSubmit} noValidate className="stack">
        {formError && <Alert type="error">{formError}</Alert>}

        <Field label="Username" error={errors.username} hint="3–30 letters, numbers or underscores" id="username">
          {(props) => (
            <Input
              {...props}
              value={values.username}
              onChange={(e) => update('username', e.target.value)}
              autoComplete="username"
              placeholder="e.g. mobina_reads"
              autoFocus
            />
          )}
        </Field>

        <Field label="Email" error={errors.email} id="email">
          {(props) => (
            <Input
              {...props}
              type="email"
              value={values.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field label="Password" error={errors.password} hint="At least 8 characters" id="password">
          {(props) => (
            <PasswordInput
              {...props}
              value={values.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete="new-password"
              placeholder="Choose a strong password"
            />
          )}
        </Field>

        <Button type="submit" block loading={submitting} loadingText="Creating account…" style={{ marginTop: '0.5rem' }}>
          Create account
        </Button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
