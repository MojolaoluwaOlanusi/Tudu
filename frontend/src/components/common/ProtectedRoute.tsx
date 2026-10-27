import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { rememberPostLoginDestination } from '../../lib/postLoginRedirect';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where they were trying to go so Login / AuthCallback can
    // land them there after a successful sign-in. Previously every
    // protected route redirect lost the destination.
    rememberPostLoginDestination(
      location.pathname + location.search + location.hash
    );
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;