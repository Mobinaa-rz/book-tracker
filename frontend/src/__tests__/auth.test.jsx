import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.js';
import { ApiError } from '../api/client.js';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { GuestRoute, ProtectedRoute } from '../components/layout/ProtectedRoute.jsx';
import { LocationDisplay, renderWithProviders, testUser } from '../test/utils.jsx';

vi.mock('../api/auth.js', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

beforeEach(() => {
  authApi.me.mockReset();
  authApi.login.mockReset();
  authApi.register.mockReset();
});

describe('LoginPage', () => {
  it('shows validation errors when fields are empty', async () => {
    renderWithProviders(<LoginPage />, { user: null, route: '/login' });

    await userEvent.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('logs in and redirects to the dashboard', async () => {
    authApi.login.mockResolvedValue(testUser);
    renderWithProviders(<LoginPage />, {
      user: null,
      route: '/login',
      extraRoutes: <Route path="/" element={<LocationDisplay />} />,
    });

    await userEvent.type(await screen.findByLabelText('Email'), 'mobina@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
    expect(authApi.login).toHaveBeenCalledWith({ email: 'mobina@example.com', password: 'password123' });
  });

  it('shows the server error for wrong credentials', async () => {
    authApi.login.mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    renderWithProviders(<LoginPage />, { user: null, route: '/login' });

    await userEvent.type(await screen.findByLabelText('Email'), 'mobina@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  it('toggles password visibility', async () => {
    renderWithProviders(<LoginPage />, { user: null, route: '/login' });
    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});

describe('RegisterPage', () => {
  it('validates username, email and password before submitting', async () => {
    renderWithProviders(<RegisterPage />, { user: null, route: '/register' });

    await userEvent.type(await screen.findByLabelText('Username'), 'a!');
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('registers, shows a welcome toast and redirects to the dashboard', async () => {
    authApi.register.mockResolvedValue(testUser);
    renderWithProviders(<RegisterPage />, {
      user: null,
      route: '/register',
      extraRoutes: <Route path="/" element={<LocationDisplay />} />,
    });

    await userEvent.type(await screen.findByLabelText('Username'), 'mobina');
    await userEvent.type(screen.getByLabelText('Email'), 'mobina@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
    expect(authApi.register).toHaveBeenCalledWith({
      username: 'mobina',
      email: 'mobina@example.com',
      password: 'password123',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Welcome, mobina!');
  });

  it('maps a 409 from the server onto the email field', async () => {
    authApi.register.mockRejectedValue(
      new ApiError(409, 'This email is already registered', { email: 'This email is already registered' }),
    );
    renderWithProviders(<RegisterPage />, { user: null, route: '/register' });

    await userEvent.type(await screen.findByLabelText('Username'), 'mobina');
    await userEvent.type(screen.getByLabelText('Email'), 'mobina@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('This email is already registered')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('route guards', () => {
  it('ProtectedRoute redirects logged-out users to /login', async () => {
    renderWithProviders(<ProtectedRoute />, {
      user: null,
      route: '/books',
      path: '/books',
      extraRoutes: <Route path="/login" element={<LocationDisplay />} />,
    });

    expect(await screen.findByTestId('location')).toHaveTextContent('/login');
  });

  it('ProtectedRoute renders the page for logged-in users', async () => {
    renderWithProviders(<LocationDisplay />, {
      route: '/secret',
      path: '/unused',
      extraRoutes: (
        <Route element={<ProtectedRoute />}>
          <Route path="/secret" element={<p>Secret page</p>} />
        </Route>
      ),
    });

    expect(await screen.findByText('Secret page')).toBeInTheDocument();
  });

  it('ProtectedRoute shows a loading state while the session is being checked', async () => {
    let resolveSession;
    authApi.me.mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    renderWithProviders(<ProtectedRoute />, { route: '/', path: '/' });

    expect(screen.getByRole('status', { name: 'Checking your session' })).toBeInTheDocument();

    resolveSession(testUser);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('GuestRoute sends logged-in users to the dashboard', async () => {
    renderWithProviders(<GuestRoute />, {
      route: '/login',
      path: '/login',
      extraRoutes: <Route path="/" element={<LocationDisplay />} />,
    });

    expect(await screen.findByTestId('location')).toHaveTextContent('/');
  });
});
