import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../common/ThemeToggle';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
    isActive
      ? 'bg-accent text-white shadow-sm'
      : 'text-ink-muted hover:bg-surface hover:text-ink'
  }`;

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  const Avatar = ({ size }: { size: string }) =>
    user?.avatar_url ? (
      <img
        src={user.avatar_url}
        alt={user.name || 'User'}
        className={`${size} rounded-full object-cover ring-2 ring-accent`}
      />
    ) : (
      <span
        className={`${size} flex items-center justify-center rounded-full bg-accent text-sm font-semibold text-white`}
      >
        {initial}
      </span>
    );

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-surface shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6">
        <img
          src="/wordmark.png"
          alt="Tudu"
          className="h-9 w-auto shrink-0 dark:invert sm:h-10"
        />

        {/* On mobile the nav drops onto its own full-width row so it can
            never overlap the wordmark or the controls beside it. */}
        <nav className="order-last flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface-2 p-1 sm:order-none sm:mx-auto sm:w-auto sm:justify-start">
          <NavLink to="/" end className={navClass}>
            List
          </NavLink>
          <NavLink to="/board" className={navClass}>
            Board
          </NavLink>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {user && (
            <>
              <div className="lg:hidden">
                <Avatar size="h-9 w-9" />
              </div>

              <div className="hidden items-center gap-3 rounded-full border border-hairline bg-surface-2 py-1.5 pl-1.5 pr-4 lg:flex">
                <Avatar size="h-9 w-9" />
                <div className="leading-tight">
                  <p className="text-[10px] uppercase tracking-wide text-ink-muted">Signed in as</p>
                  <p className="max-w-[140px] truncate text-sm font-semibold text-ink">{user.name}</p>
                </div>
              </div>

              <button
                onClick={logout}
                title="Logout"
                className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm transition-all hover:border-accent hover:bg-accent-soft hover:text-accent-strong"
              >
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 01-2-2V7a2 2 0 012-2h6"
                  />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;


