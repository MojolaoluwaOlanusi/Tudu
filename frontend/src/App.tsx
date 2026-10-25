import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { queryClient } from './lib/queryClient';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useAuthStore } from './store/authStore';
import { attachScrollbarAutoHide } from './lib/scrollbar';

import Login from './components/auth/Login';
import Pricing from './routes/Pricing';
import BillingCallback from './routes/BillingCallback';
import AuthCallback from './components/auth/AuthCallback';
import AppSettings from './pages/app/AppSettings';
import SettingsAccount from './pages/app/settings/SettingsAccount';
import SettingsNotifications from './pages/app/settings/SettingsNotifications';
import SettingsAppearance from './pages/app/settings/SettingsAppearance';
import SettingsIntegrations from './pages/app/settings/SettingsIntegrations';
import SettingsWorkspace from './pages/app/settings/SettingsWorkspace';
import SettingsBilling from './pages/app/settings/SettingsBilling';
import SettingsLicense from './pages/app/settings/SettingsLicense';
import SettingsApi from './pages/app/settings/SettingsApi';
import SettingsWebhooks from './pages/app/settings/SettingsWebhooks';
import ProtectedRoute from './components/common/ProtectedRoute';

import Topbar from './components/app/Topbar';
import Sidebar from './components/app/Sidebar';
import DetailPanel from './components/app/DetailPanel';
import LicenseBanner from './components/common/LicenseBanner';

import TaskList from './components/tasks/TaskList';
import KanbanBoard from './components/kanban/KanbanBoard';
import BoardTaskForm from './components/kanban/BoardTaskForm';
import Landing from './components/landing/Landing';
import ComingSoon from './components/landing/ComingSoon';
import WizardRoot from './components/onboarding/WizardRoot';
import WorkspaceInvites from './components/workspace/WorkspaceInvites';
import ShareInvites from './components/sharing/ShareInvites';
import SharedWithMeSection from './components/sharing/SharedWithMeSection';
import SharedListView from './components/sharing/SharedListView';
import PomodoroStats from './components/pomodoro/PomodoroStats';
import WeeklyReport from './components/time/WeeklyReport';
import TimeLog from './components/time/TimeLog';
import FeatureGate from './components/common/FeatureGate';
import PomodoroRunner from './components/pomodoro/PomodoroRunner';
import ToastContainer from './components/common/ToastContainer';
import ShortcutHelp from './components/common/ShortcutHelp';
import CommandPalette from './components/common/CommandPalette';
import InstallPrompt from './components/common/InstallPrompt';
import OfflineIndicator from './components/common/OfflineIndicator';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOfflineSync } from './hooks/useOfflineSync';
import UndoToast from './components/common/UndoToast';
import OnboardingRoot from './components/onboarding/OnboardingRoot';
import { ConfettiProvider } from './components/common/ConfettiProvider';
import ErrorBoundary from './components/common/ErrorBoundary';

/** Opens the real-time socket once we know who is signed in. */
const CollaborationBridge = () => {
  useRealtimeSync();
  return null;
};

/** Mounts the global keyboard listener (Ctrl+K, chords, etc). */
const ShortcutBridge = () => {
  useKeyboardShortcuts();
  return null;
};

const OfflineBridge = () => {
  useOfflineSync();
  return null;
};

const AnalyticsDashboard = lazy(() => import('./components/analytics/AnalyticsDashboard'));

/**
 * App shell.
 *
 * Fixed-height flex column: the topbar and sidebar stay put, the main pane
 * scrolls inside itself, and the detail panel slides in from the right.
 * Matches the mockup's `AppLayout`.
 *
 * Mobile-only fallbacks: the Sidebar is desktop-only (`lg`+), so the
 * invitations banner and the "shared with me" section are surfaced here
 * for small screens — otherwise a mobile user has no way to accept an
 * invite or open a shared list. On `lg` the Sidebar owns both.
 */
const Shell = ({ children, noPadding = false }: { children: ReactNode; noPadding?: boolean }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mainRef.current) return;
    return attachScrollbarAutoHide(mainRef.current);
  }, []);

  return (
    <div data-app-shell className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
      <Topbar />
      <LicenseBanner />
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line-subtle bg-surface">
          <div data-main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className={`flex min-h-full flex-col ${noPadding ? '' : 'p-4 md:p-6'}`}>
              {!noPadding && (
                <>
                  {/* Mobile-only. On lg+, the Sidebar owns these sections. */}
                  <div className="mb-4 lg:hidden">
                    <ShareInvites />
                  </div>
                  <WorkspaceInvites />
                  <div className="lg:hidden">
                    <SharedWithMeSection />
                  </div>
                </>
              )}
              {children}
            </div>
          </div>
        </main>
        <DetailPanel />
      </div>
    </div>
  );
};

const LandingOrApp = ({ children }: { children: ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Landing />;
};

const Dashboard = () => (
  <Shell>
    <TaskList />
  </Shell>
);

const Board = () => (
  <Shell noPadding>
    <div data-tour="board">
      <KanbanBoard />
      <BoardTaskForm />
    </div>
  </Shell>
);

const Stats = () => (
  <Shell>
    <div data-tour="stats">
      <div className="mb-6">
        <h1 className="font-handwritten text-3xl leading-none text-ink sm:text-4xl">Focus stats</h1>
        <p className="mt-2 text-[11px] text-ink-faint">Pomodoro history and per-task time.</p>
      </div>
      <PomodoroStats />
      <FeatureGate
        feature="time.tracking"
        title="Time tracking"
        description="Log work hours, track billable time, and see a weekly report."
      >
        <div className="mt-6 space-y-5">
          <WeeklyReport />
          <TimeLog />
        </div>
      </FeatureGate>
    </div>
  </Shell>
);

const Analytics = () => (
  <Shell>
    <div data-tour="analytics">
      <div className="mb-6">
        <h1 className="font-handwritten text-3xl leading-none text-ink sm:text-4xl">Analytics</h1>
        <p className="mt-2 text-[11px] text-ink-faint">Workload, completion rate and focus — personal or team.</p>
      </div>
      <Suspense
        fallback={
          <div className="card p-6">
            <p className="text-sm text-ink-muted">Loading your dashboard…</p>
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  </Shell>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfettiProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/billing/callback" element={<BillingCallback />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Shell>
                      <AppSettings />
                    </Shell>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/settings/account" replace />} />
                <Route path="account" element={<SettingsAccount />} />
                <Route path="notifications" element={<SettingsNotifications />} />
                <Route path="appearance" element={<SettingsAppearance />} />
                <Route path="integrations" element={<SettingsIntegrations />} />
                <Route path="workspace" element={<SettingsWorkspace />} />
                <Route path="billing" element={<SettingsBilling />} />
                <Route path="license" element={<SettingsLicense />} />
                <Route path="api" element={<SettingsApi />} />
                <Route path="webhooks" element={<SettingsWebhooks />} />
              </Route>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/"
                element={
                  <LandingOrApp>
                    <Dashboard />
                  </LandingOrApp>
                }
              />
              <Route
                path="/board"
                element={
                  <ProtectedRoute>
                    <Board />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stats"
                element={
                  <ProtectedRoute>
                    <Stats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shared/:id"
                element={
                  <ProtectedRoute>
                    <SharedListView />
                  </ProtectedRoute>
                }
              />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/demo" element={<ComingSoon title="Live demo" />} />
              <Route path="/docs" element={<ComingSoon title="Documentation" />} />
              <Route path="/docs/:slug" element={<ComingSoon title="Documentation" />} />
              <Route path="/webhooks" element={<ComingSoon title="Webhooks" />} />
              <Route path="/changelog" element={<ComingSoon title="Changelog" />} />
              <Route path="/help" element={<ComingSoon title="Help center" />} />
              <Route path="/contact" element={<ComingSoon title="Contact" />} />
              <Route path="/blog" element={<ComingSoon title="Blog" />} />
              <Route path="/community" element={<ComingSoon title="Community" />} />
              <Route path="/status" element={<ComingSoon title="Status page" />} />
              <Route path="/privacy" element={<ComingSoon title="Privacy" />} />
              <Route path="/terms" element={<ComingSoon title="Terms" />} />
              <Route path="/solutions" element={<ComingSoon title="Solutions" />} />
              <Route path="/solutions/:slug" element={<ComingSoon title="Solutions" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <CollaborationBridge />
            <OfflineBridge />
            <ShortcutBridge />
            <OfflineIndicator />
            <InstallPrompt />
            <ShortcutHelp />
            <CommandPalette />
            <PomodoroRunner />
            <WizardRoot />
            <OnboardingRoot />
            <UndoToast />
            <ToastContainer />
            <VercelAnalytics />
          </Router>
        </ConfettiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

