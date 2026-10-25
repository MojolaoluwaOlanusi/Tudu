import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { Avatar, PageHeader, Section } from './primitives';

const SettingsAccount: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Account" description="Your profile and session." />
      <Section title="Profile">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} email={user.email} url={user.avatar_url} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink">{user.name || user.email}</p>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-faint">
              Signed in with {user.provider}
            </p>
          </div>
        </div>
      </Section>
      <Section title="Session">
        <p className="mb-3 text-sm text-ink-muted">Signing out ends this session on this device.</p>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-red-400 hover:border-red-400/50"
        >
          Sign out
        </button>
      </Section>
    </div>
  );
};

export default SettingsAccount;
