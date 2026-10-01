import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from './lib/queryClient';
import { useCollaborationSocket } from './hooks/useCollaborationSocket';
import Login from './components/auth/Login';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/common/ProtectedRoute';
import Header from './components/layout/Header';
import TaskList from './components/tasks/TaskList';
import KanbanBoard from './components/kanban/KanbanBoard';
import SharedListsSidebar from './components/sharing/SharedListsSidebar';
import SharedListView from './components/sharing/SharedListView';
import ToastContainer from './components/common/ToastContainer';

/** Opens the collaboration socket once we know who is signed in. */
const CollaborationBridge = () => {
  useCollaborationSocket();
  return null;
};

/** App shell: header plus the shared-lists sidebar on large screens. */
const Shell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen">
    <Header />
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <aside className="hidden w-64 shrink-0 lg:block">
        <SharedListsSidebar />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
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
    <KanbanBoard />
  </Shell>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
        <ToastContainer />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
