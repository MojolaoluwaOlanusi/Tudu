import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './components/auth/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import Header from './components/layout/Header';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-brand-light dark:bg-brand-dark">
                  <Header />
                  <div className="container mx-auto px-4 py-8">
                    <h2 className="text-2xl font-handwritten text-gray-800 dark:text-white mb-4">
                      Dashboard
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      Welcome to Tudu! Your tasks will appear here.
                    </p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
