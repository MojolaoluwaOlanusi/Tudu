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
import Timer from '../time/Timer';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import PomodoroTimerHeader from '../pomodoro/PomodoroTimerHeader';

const navClass = ({ isActive }: { isActive: boolean }) =>
  'whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ' +
  (isActive
    ? 'bg-brand-subtle text-brand'
    : 'text-ink-muted hover:bg-raised hover:text-ink');

const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink';

const Header: React.FC = () => {
  const [apiTokensOpen, setApiTokensOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const { data: entitlements } = useEntitlements();
  const isFree = !entitlements || entitlements.tier === 'free';
  const hasTimeTracking = useFeatureFlag('time.tracking');
  const hasWebhooks = Boolean(entitlements?.features?.['api.public.write']);

  const Avatar = ({ size }: { size: string }) =>
    user?.avatar_url ? (
      <img
        src={user.avatar_url}
        alt={user.name || 'User'}
        className={`${size} rounded-full object-cover ring-2 ring-brand/40`}
      />
    ) : (
      <span
        className={`${size} flex items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-ink-inverse`}
      >
        {initial}
      </span>
    );

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line-subtle bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:flex-nowrap sm:px-6">
        <div data-testid="header-wordmark" className="shrink-0">
          <Wordmark className="h-8 w-auto sm:h-9" />
        </div>

        <nav
          data-tour="nav"
          data-testid="header-nav"
          className="order-last flex w-full min-w-0 shrink flex-wrap items-center justify-center gap-0.5 sm:order-none sm:mx-2 sm:w-auto sm:flex-nowrap sm:justify-start"
        >
          <NavLink to="/" end className={navClass}>List</NavLink>
          <NavLink to="/board" className={navClass}>Board</NavLink>
          <NavLink to="/stats" className={navClass}>Stats</NavLink>
          <NavLink to="/analytics" className={navClass}>Analytics</NavLink>
        </nav>

        <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-0.5 sm:flex-nowrap sm:gap-1">
          {user && <div data-testid="header-sync"><SyncIndicator /></div>}
          {user && <div data-testid="header-pomodoro"><PomodoroTimerHeader /></div>}
          {hasTimeTracking && <div data-testid="header-timer"><Timer /></div>}
          <div data-testid="header-theme"><ThemeToggle /></div>

          {user && (
            <button type="button" data-testid="header-notifications"
              onClick={() => setNotificationsOpen(true)}
              aria-label="Notification settings" title="Notification settings"
              className={iconBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          )}

          {user && (
            <button type="button" data-testid="header-api-tokens"
              onClick={() => setApiTokensOpen(true)}
              aria-label="API tokens" title="Manage API tokens"
              className={iconBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          {user && isFree && (
            <NavLink to="/pricing" data-testid="header-upgrade"
              className="rounded-md border border-brand/50 bg-brand-subtle px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/15">
              ★ Upgrade
            </NavLink>
          )}
          {user && !isFree && (
            <NavLink to="/settings/billing" data-testid="header-pro" title="View billing"
              className="flex items-center gap-1 rounded-md border border-brand/50 bg-brand-subtle px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/15">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l2.9 6.3 6.9.9-5 4.8 1.2 6.9L12 17.8 6 21l1.2-6.9-5-4.8 6.9-.9z" />
              </svg>
              Pro
            </NavLink>
          )}

          {user && (
            <NavLink to="/settings/integrations" data-testid="header-integrations"
              title="Integrations" aria-label="Integrations" className={iconBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </NavLink>
          )}

          {user && hasWebhooks && (
            <button type="button" data-testid="header-webhooks"
              onClick={() => setWebhooksOpen(true)}
              aria-label="Webhooks" title="Manage outbound webhooks"
              className={iconBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          )}

          {user && <div data-testid="header-tour"><TourButton /></div>}

          {user && (
            <>
              <div data-testid="header-avatar" className="lg:hidden"><Avatar size="h-8 w-8" /></div>
              <div data-testid="header-user-pill"
                className="hidden items-center gap-2 rounded-md border border-line bg-surface py-0.5 pl-0.5 pr-2 lg:flex">
                <Avatar size="h-7 w-7" />
                <div className="leading-tight">
                  <p className="text-[9px] uppercase tracking-wide text-ink-faint">Signed in</p>
                  <p className="max-w-[120px] truncate text-[12px] font-semibold text-ink">{user.name}</p>
                </div>
              </div>
              <button type="button" data-testid="header-logout" onClick={logout}
                title="Logout" aria-label="Logout"
                className={iconBtn + ' hover:bg-red-500/10 hover:text-red-500'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 01-2-2V7a2 2 0 012-2h6" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      {notificationsOpen && <NotificationSettingsModal onClose={() => setNotificationsOpen(false)} />}
      {apiTokensOpen && <ApiTokensModal onClose={() => setApiTokensOpen(false)} />}
      {webhooksOpen && <WebhooksModal onClose={() => setWebhooksOpen(false)} />}
    </header>
  );
};

export default Header;