import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../common/ThemeToggle';
import Wordmark from '../common/Wordmark';
import SyncIndicator from '../common/SyncIndicator';
import TourButton from '../onboarding/TourButton';
import PomodoroTimer from '../pomodoro/PomodoroTimer';

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
    <header className="glass sticky top-0 z-20 shadow-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Wordmark className="h-9 w-auto shrink-0 sm:h-10" />

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            {user && <SyncIndicator />}
            {user && (
              <PomodoroTimer
                compact
                className="max-w-[min(42vw,220px)] sm:max-w-[min(30vw,220px)]"
              />
            )}
            <ThemeToggle />
            {user && <TourButton />}
          </div>
        </div>

        <nav
          data-tour="nav"
          className="order-last flex w-full min-w-0 flex-wrap items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface-2 p-1 lg:order-none lg:mx-auto lg:w-auto lg:justify-start"
        >
          <NavLink to="/" end className={navClass}>
            List
          </NavLink>
          <NavLink to="/board" className={navClass}>
            Board
          </NavLink>
          <NavLink to="/stats" className={navClass}>
            Stats
          </NavLink>
          <NavLink to="/analytics" className={navClass}>
            Analytics
          </NavLink>
        </nav>

        {user && (
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="hidden lg:flex">
              <Avatar size="h-9 w-9" />
            </div>

            <div className="hidden items-center gap-3 rounded-full border border-hairline bg-surface-2 py-1.5 pl-1.5 pr-4 xl:flex">
              <Avatar size="h-9 w-9" />
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wide text-ink-muted">Signed in as</p>
                <p className="max-w-[140px] truncate text-sm font-semibold text-ink">{user.name}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-300"
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
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
