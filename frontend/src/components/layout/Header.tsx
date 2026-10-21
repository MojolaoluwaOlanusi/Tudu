import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../common/ThemeToggle';
import ApiTokensModal from '../settings/ApiTokensModal';
import WebhooksModal from '../settings/WebhooksModal';
import { useEntitlements } from '../../hooks/useBilling';
import NotificationSettingsModal from '../settings/NotificationSettingsModal';
import Wordmark from '../common/Wordmark';
import SyncIndicator from '../common/SyncIndicator';
import TourButton from '../onboarding/TourButton';
import { NavLink as RouterNavLink } from 'react-router-dom';

import PomodoroTimerHeader from '../pomodoro/PomodoroTimerHeader';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
    isActive
      ? 'bg-accent text-white shadow-sm'
      : 'text-ink-muted hover:bg-surface hover:text-ink'
  }`;

const Header: React.FC = () => {
  const [apiTokensOpen, setApiTokensOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const { data: entitlements } = useEntitlements();
  const isFree = !entitlements || entitlements.tier === 'free';

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
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6">
        <Wordmark className="h-9 w-auto shrink-0 sm:h-10" />

        <nav
          data-tour="nav"
          className="order-last flex w-full min-w-0 shrink flex-wrap items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface-2 p-1 sm:order-none sm:mx-auto sm:w-auto sm:justify-start"
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

        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
          {user && <SyncIndicator />}
          {user && <PomodoroTimerHeader />}
          <ThemeToggle />

          {user && (
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-label="Notification settings"
              title="Notification settings"
              className="rounded-full border border-hairline bg-surface-2 p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={() => setApiTokensOpen(true)}
              aria-label="API tokens"
              title="Manage API tokens"
              className="rounded-full border border-hairline bg-surface-2 p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          {user && isFree && (
            <NavLink
              to="/pricing"
              className="rounded-full border border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent/20"
            >
              ★ Upgrade
            </NavLink>
          )}

          {user && !isFree && (
            <NavLink
              to="/settings/billing"
              title="View billing"
              className="flex items-center gap-1.5 rounded-full border border-accent bg-accent/15 px-3 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent/25"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2l2.9 6.3 6.9.9-5 4.8 1.2 6.9L12 17.8 6 21l1.2-6.9-5-4.8 6.9-.9z" />
              </svg>
              Pro
            </NavLink>
          )}
          {user && (
            <RouterNavLink
              to="/settings/integrations"
              title="Integrations"
              className="rounded-full border border-hairline bg-surface-2 p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </RouterNavLink>
          )}
          {user && entitlements?.features?.['api.public.write'] && (
            <button
              type="button"
              onClick={() => setWebhooksOpen(true)}
              aria-label="Webhooks"
              title="Manage outbound webhooks"
              className="rounded-full border border-hairline bg-surface-2 p-2 text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          )}
          {user && <TourButton />}

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
                className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-300"
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
      {notificationsOpen && (
        <NotificationSettingsModal onClose={() => setNotificationsOpen(false)} />
      )}
      {apiTokensOpen && <ApiTokensModal onClose={() => setApiTokensOpen(false)} />}
      {webhooksOpen && <WebhooksModal onClose={() => setWebhooksOpen(false)} />}
    </header>
  );
};

export default Header;