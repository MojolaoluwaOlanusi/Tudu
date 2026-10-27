import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({ setUser: vi.fn(), isAuthenticated: false }),
}));

vi.mock('../services/authService', () => ({
  authService: {
    emailLogin: vi.fn(),
    emailRegister: vi.fn(),
    googleLogin: vi.fn(),
    githubLogin: vi.fn(),
  },
}));

const mockMethods = vi.fn();
vi.mock('../hooks/useAuthMethods', () => ({
  useAuthMethods: () => ({ data: mockMethods() }),
}));

import Login from '../components/auth/Login';

const wrap = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login — auth-methods aware', () => {
  beforeEach(() => mockMethods.mockReset());

  it('shows both OAuth buttons and Continue with Email when both are enabled', () => {
    mockMethods.mockReturnValue({ email: true, google: true, github: true });
    wrap();
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with github/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with email/i })
    ).toBeInTheDocument();
  });

  it('hides the GitHub button when only Google is configured', () => {
    mockMethods.mockReturnValue({ email: true, google: true, github: false });
    wrap();
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continue with github/i })
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: /continue with email/i })
    ).toBeInTheDocument();
  });

  it('hides the Google button when only GitHub is configured', () => {
    mockMethods.mockReturnValue({ email: true, google: false, github: true });
    wrap();
    expect(
      screen.queryByRole('button', { name: /continue with google/i })
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: /continue with github/i })
    ).toBeInTheDocument();
  });

  it('skips the OAuth step and shows the email form when neither is configured', async () => {
    mockMethods.mockReturnValue({ email: true, google: false, github: false });
    wrap();
    // The auto-switch effect runs after `methods` resolves.
    await waitFor(() => {
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /continue with google/i })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /continue with github/i })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /continue with email/i })
    ).toBeNull();
    expect(screen.queryByText(/back to oauth options/i)).toBeNull();
  });

  it('shows the signup heading, not the login heading, on a no-OAuth /signup', async () => {
    mockMethods.mockReturnValue({ email: true, google: false, github: false });
    render(
      <MemoryRouter>
        <Login mode="signup" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /create your account/i })
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/back to oauth options/i)).toBeNull();
  });

  it('defaults to showing both OAuth buttons when methods have not resolved', () => {
    mockMethods.mockReturnValue(undefined);
    wrap();
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with github/i })
    ).toBeInTheDocument();
  });
});