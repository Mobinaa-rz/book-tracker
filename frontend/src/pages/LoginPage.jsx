import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { Button, Field, Input, PasswordInput, Alert } from '../components/ui/index.js';

export function LoginPage() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';
  const sessionExpired = location.state?.reason === 'expired';

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!values.email.trim()) next.email = 'Email is required';
    if (!values.password) next.password = 'Password is required';
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const clientErrors = validate();
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error.details) setErrors(error.details);
      else setFormError(error.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">Welcome back</h1>
      <p className="auth-card__subtitle">Log in to continue to your library.</p>

      <form onSubmit={handleSubmit} noValidate className="stack">
        {sessionExpired && !formError && (
          <Alert type="info">Your session expired. Please log in again.</Alert>
        )}
        {formError && <Alert type="error">{formError}</Alert>}

        <Field label="Email" error={errors.email} id="email">
          {(props) => (
            <Input
              {...props}
              type="email"
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
              autoComplete="email"
              placeholder="you@example.com"
              autoFocus
            />
          )}
        </Field>

        <Field label="Password" error={errors.password} id="password">
          {(props) => (
            <PasswordInput
              {...props}
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
              autoComplete="current-password"
              placeholder="Your password"
            />
          )}
        </Field>

        <Button type="submit" block loading={submitting} loadingText="Logging in…" style={{ marginTop: '0.5rem' }}>
          Log in
        </Button>
      </form>

      <p className="auth-footer">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
