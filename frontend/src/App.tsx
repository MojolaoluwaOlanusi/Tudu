import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, type ReactNode } from 'react';
import { queryClient } from './lib/queryClient';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import Login from './components/auth/Login';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/common/ProtectedRoute';
import Header from './components/layout/Header';
import TaskList from './components/tasks/TaskList';
import KanbanBoard from './components/kanban/KanbanBoard';
import SharedListsSidebar from './components/sharing/SharedListsSidebar';
import ShareInvites from './components/sharing/ShareInvites';
import SharedWithMeSection from './components/sharing/SharedWithMeSection';
import RecentActivity from './components/activity/RecentActivity';
import SharedListView from './components/sharing/SharedListView';
import PomodoroStats from './components/pomodoro/PomodoroStats';
import PomodoroRunner from './components/pomodoro/PomodoroRunner';
import ToastContainer from './components/common/ToastContainer';
import OnboardingRoot from './components/onboarding/OnboardingRoot';
import { ConfettiProvider } from './components/common/ConfettiProvider';

/** Opens the real-time socket once we know who is signed in. */
const CollaborationBridge = () => {
  useRealtimeSync();
  return null;
};

/**
 * Chart.js is ~200kB of the bundle and only the analytics page needs it, so
 * the route is code-split; everyone else never downloads it.
 */
const AnalyticsDashboard = lazy(() => import('./components/analytics/AnalyticsDashboard'));

/** App shell: header plus the shared-lists sidebar on large screens. */
const Shell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen">
    <Header />
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <aside className="hidden w-64 shrink-0 lg:block" data-tour="shared">
        <SharedListsSidebar />
      </aside>
      <main className="min-w-0 flex-1">
        {/* Invitations must be reachable without the sidebar (mobile). */}
        <div className="mb-4 lg:hidden">
          <ShareInvites />
        </div>
        <SharedWithMeSection />
        {children}
        <div className="mt-6" data-tour="activity">
          <RecentActivity />
        </div>
      </main>
    </div>
  </div>
);

const Dashboard = () => (
  <Shell>
    <TaskList />
  </Shell>
);

const Board = () => (
  <Shell>
    <div data-tour="board">
      <KanbanBoard />
    </div>
  </Shell>
);

const Stats = () => (
  <Shell>
    <div data-tour="stats">
      <h1 className="mb-4 font-handwritten text-3xl text-ink">Focus stats</h1>
      <PomodoroStats />
    </div>
  </Shell>
);

const Analytics = () => (
  <Shell>
    <div data-tour="analytics">
      <h1 className="mb-4 font-handwritten text-3xl text-ink">Analytics</h1>
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
    <QueryClientProvider client={queryClient}>
      <ConfettiProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CollaborationBridge />
        <PomodoroRunner />
        <OnboardingRoot />
        <ToastContainer />
        </Router>
      </ConfettiProvider>
    </QueryClientProvider>
  );
}

export default App;
