import React from 'react';
import { useAuthStore } from '../../store/authStore';

const Header: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <img src="/wordmark.png" alt="Tudu" className="h-10 w-auto dark:invert" />

          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* User chip */}
              <div className="flex items-center gap-3 rounded-full bg-gray-100 py-1.5 pl-1.5 pr-4 dark:bg-gray-700/60">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || 'User'}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-green"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green text-sm font-semibold text-white ring-2 ring-white dark:ring-gray-700">
                    {initial}
                  </span>
                )}
                <div className="hidden leading-tight sm:block">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Signed in as
                  </p>
                  <p className="max-w-[140px] truncate text-sm font-semibold text-gray-800 dark:text-white">
                    {user.name}
                  </p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Logout"
                className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-red-500/40 dark:hover:bg-red-900/30 dark:hover:text-red-300"
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
      </div>
    </header>
  );
};

export default Header;

