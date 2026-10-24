import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Bell,
  KeyRound,
  Webhook as WebhookIcon,
  LayoutGrid,
  Users,
  Plug,
  CreditCard,
  Key,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useEntitlements } from '../../hooks/useBilling';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import Wordmark from '../common/Wordmark';
import ThemeToggle from '../common/ThemeToggle';
import TourButton from '../onboarding/TourButton';
import PomodoroTimerHeader from '../pomodoro/PomodoroTimerHeader';
import Timer from '../time/Timer';
import NotificationSettingsModal from '../settings/NotificationSettingsModal';
import ApiTokensModal from '../settings/ApiTokensModal';
import WebhooksModal from '../settings/WebhooksModal';
import BoardsModal from '../kanban/BoardsModal';
import TeamModal from '../workspace/TeamModal';
import SyncDot from './SyncDot';

const NAV = [
  { to: '/', label: 'List', end: true },
  { to: '/board', label: 'Board' },
  { to: '/stats', label: 'Stats' },
  { to: '/analytics', label: 'Analytics' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  'whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ' +
  (isActive
    ? 'bg-brand-subtle text-brand'
    : 'text-ink-muted hover:bg-raised hover:text-ink');

const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink';

const menuItem =
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink-muted transition-colors hover:bg-raised hover:text-ink';

const MenuSep = () => <div className="my-1 h-px bg-line-subtle" />;

const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { data: entitlements } = useEntitlements();
  const isFree = !entitlements || entitlements.tier === 'free';
  const hasWebhooks = Boolean(entitlements?.features?.['api.public.write']);
  const hasTimeTracking = useFeatureFlag('time.tracking');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [apiTokensOpen, setApiTokensOpen] = useState(false);
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const [boardsOpen, setBoardsOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  const openAnd = (setter: (v: boolean) => void) => () => {
    setSettingsOpen(false);
    setter(true);
  };
  const navigateAnd = (path: string) => () => {
    setSettingsOpen(false);
    navigate(path);
  };

  const SettingsMenu: React.FC = () => (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setSettingsOpen(false)} aria-hidden="true" />
      <div
        role="menu"
        aria-label="Settings"
        className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border border-line bg-surface p-1 shadow-2xl"
      >
        <button type="button" role="menuitem" onClick={openAnd(setNotificationOpen)} className={menuItem}>
          <Bell className="h-3.5 w-3.5 shrink-0" />
          Notification settings
        </button>
        <button type="button" role="menuitem" onClick={openAnd(setApiTokensOpen)} className={menuItem}>
          <KeyRound className="h-3.5 w-3.5 shrink-0" />
          API tokens
        </button>
        {hasWebhooks && (
          <button type="button" role="menuitem" onClick={openAnd(setWebhooksOpen)} className={menuItem}>
            <WebhookIcon className="h-3.5 w-3.5 shrink-0" />
            Webhooks
          </button>
        )}
        <MenuSep />
        <button type="button" role="menuitem" onClick={openAnd(setBoardsOpen)} className={menuItem}>
          <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
          Manage boards
        </button>
        <button type="button" role="menuitem" onClick={openAnd(setTeamOpen)} className={menuItem}>
          <Users className="h-3.5 w-3.5 shrink-0" />
          Team workspaces
        </button>
        <MenuSep />
        <button type="button" role="menuitem" onClick={navigateAnd('/settings/integrations')} className={menuItem}>
          <Plug className="h-3.5 w-3.5 shrink-0" />
          Integrations
        </button>
        <button type="button" role="menuitem" onClick={navigateAnd('/settings/billing')} className={menuItem}>
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          Billing
        </button>
        <button type="button" role="menuitem" onClick={navigateAnd('/settings/license')} className={menuItem}>
          <Key className="h-3.5 w-3.5 shrink-0" />
          License
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 shrink-0 border-b border-line-subtle bg-canvas/80 backdrop-blur">
        {/* Desktop */}
        <div className="hidden h-14 items-center gap-3 px-4 md:flex">
          <Link to="/" className="shrink-0" aria-label="Tudu home">
            <Wordmark className="h-8 w-auto" />
          </Link>
          <nav
            data-tour="nav"
            aria-label="Primary"
            className="flex min-w-0 flex-1 justify-center gap-0.5"
          >
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-0.5">
            <SyncDot />
            <PomodoroTimerHeader />
            {hasTimeTracking && <Timer />}
            <ThemeToggle />
            <TourButton />
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Settings menu"
                aria-haspopup="menu"
                aria-expanded={settingsOpen}
                title="Settings"
                className={iconBtn}
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
              {settingsOpen && <SettingsMenu />}
            </div>
            {user && isFree && (
              <NavLink
                to="/pricing"
                className="rounded-md border border-brand/50 bg-brand-subtle px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/15"
              >
                ★ Upgrade
              </NavLink>
            )}
            {user && !isFree && (
              <NavLink
                to="/settings/billing"
                title="View billing"
                className="flex items-center gap-1 rounded-md border border-brand/50 bg-brand-subtle px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/15"
              >
                Pro
              </NavLink>
            )}
            {user && (
              <button
                type="button"
                onClick={() => navigate('/settings/billing')}
                title="Profile and settings"
                aria-label="Profile and settings"
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line bg-raised pl-1 pr-2 transition-colors hover:border-line-strong"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-6 w-6 rounded object-cover" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-brand text-[10px] font-semibold text-ink-inverse">
                    {initial}
                  </span>
                )}
                <span className="hidden text-[12px] font-medium text-ink lg:inline">
                  {user.name?.split(' ')[0] || 'You'}
                </span>
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={logout}
                title="Log out"
                aria-label="Log out"
                className={iconBtn + ' hover:bg-red-500/10 hover:text-red-500'}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <div className="flex h-12 items-center gap-2 px-3">
            <Link to="/" className="shrink-0" aria-label="Tudu home">
              <Wordmark className="h-7 w-auto" />
            </Link>
            <div className="ml-auto flex items-center gap-0.5">
              <SyncDot />
              <ThemeToggle />
              {user && (
                <button
                  type="button"
                  onClick={() => navigate('/settings/billing')}
                  title="Profile"
                  aria-label="Profile"
                  className="flex h-8 shrink-0 items-center rounded-md border border-line bg-raised pl-0.5 pr-1.5"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-brand text-[10px] font-semibold text-ink-inverse">
                      {initial}
                    </span>
                  )}
                </button>
              )}
              {user && (
                <button type="button" onClick={logout} title="Log out" aria-label="Log out" className={iconBtn}>
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex h-11 items-center gap-2 overflow-x-auto border-t border-line-subtle px-3 scroll-hidden">
            <nav className="flex shrink-0 gap-0.5">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <PomodoroTimerHeader />
              {hasTimeTracking && <Timer />}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-label="Settings menu"
                  aria-haspopup="menu"
                  aria-expanded={settingsOpen}
                  className={iconBtn}
                >
                  <SettingsIcon className="h-4 w-4" />
                </button>
                {settingsOpen && <SettingsMenu />}
              </div>
            </div>
          </div>
        </div>
      </header>

      {notificationOpen && <NotificationSettingsModal onClose={() => setNotificationOpen(false)} />}
      {apiTokensOpen && <ApiTokensModal onClose={() => setApiTokensOpen(false)} />}
      {webhooksOpen && <WebhooksModal onClose={() => setWebhooksOpen(false)} />}
      {boardsOpen && <BoardsModal onClose={() => setBoardsOpen(false)} />}
      {teamOpen && <TeamModal onClose={() => setTeamOpen(false)} />}
    </>
  );
};

export default Topbar;
