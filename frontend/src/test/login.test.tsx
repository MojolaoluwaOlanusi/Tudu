import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSetUser = vi.fn();
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    setUser: mockSetUser,
    isAuthenticated: false,
  }),
}));

const mockEmailLogin = vi.fn();
const mockEmailRegister = vi.fn();
const mockGoogleLogin = vi.fn();
const mockGitHubLogin = vi.fn();
vi.mock('../services/authService', () => ({
  authService: {
    emailLogin: (...args: unknown[]) => mockEmailLogin(...args),
    emailRegister: (...args: unknown[]) => mockEmailRegister(...args),
    googleLogin: () => mockGoogleLogin(),
    githubLogin: () => mockGitHubLogin(),
  },
}));

// Login reads auth methods to decide which OAuth buttons to show. Stub
// the hook to "both enabled" so the pre-existing OAuth-button assertions
// keep working. The dedicated auth-methods behaviour lives in
// loginAuthMethods.test.tsx.
vi.mock('../hooks/useAuthMethods', () => ({
  useAuthMethods: () => ({
    data: { email: true, google: true, github: true },
  }),
}));

import Login from '../components/auth/Login';

const wrap = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

const wrapSignup = () =>
  render(
    <MemoryRouter>
      <Login mode="signup" />
    </MemoryRouter>
  );

describe('Login page', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSetUser.mockReset();
    mockEmailLogin.mockReset();
    mockEmailRegister.mockReset();
    mockGoogleLogin.mockReset();
    mockGitHubLogin.mockReset();
  });

  it('renders the Welcome back heading', () => {
    wrap();
    expect(
      screen.getByRole('heading', { name: /welcome back/i })
    ).toBeInTheDocument();
  });

  it('reveals the email form when Continue with Email is clicked', () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('calls authService.emailLogin and setUser on a valid sign-in', async () => {
    mockEmailLogin.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        provider: 'email',
        created_at: '2026-01-01T00:00:00Z',
      },
      token: 'test-token',
    });
    wrap();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockEmailLogin).toHaveBeenCalledWith('test@example.com', 'secret123');
    });
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('calls authService.googleLogin when the Google button is clicked', () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(mockGoogleLogin).toHaveBeenCalledTimes(1);
  });

  // --- Step 7: /signup mode ---

  it('shows the Create your account heading when opened in signup mode', () => {
    wrapSignup();
    expect(
      screen.getByRole('heading', { name: /create your account/i })
    ).toBeInTheDocument();
  });

  it('shows a Name field when the signup form is opened', () => {
    wrapSignup();
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
  });

  // --- Step 8: cross-page switch links + OAuth parity on /signup ---

  it('shows OAuth options on the signup page', () => {
    wrapSignup();
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with github/i })
    ).toBeInTheDocument();
  });

  it('shows a "Sign Up" link on the login page that points to /signup', () => {
    wrap();
    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link).toHaveAttribute('href', '/signup');
  });

  it('shows a "Sign In" link on the signup page that points to /login', () => {
    wrapSignup();
    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toHaveAttribute('href', '/login');
  });
});