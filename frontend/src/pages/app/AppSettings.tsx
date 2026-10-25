import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { User, Bell, Palette, Plug, Users, CreditCard, Key, KeyRound, Webhook } from 'lucide-react';

const NAV = [
  { to: '/settings/account', label: 'Account', icon: User },
  { to: '/settings/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings/appearance', label: 'Appearance', icon: Palette },
  { to: '/settings/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings/workspace', label: 'Workspace', icon: Users },
  { to: '/settings/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings/license', label: 'License', icon: Key },
  { to: '/settings/api', label: 'API tokens', icon: KeyRound },
  { to: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
];

const AppSettings: React.FC = () => (
  <div className="flex gap-6">
    <aside className="hidden w-56 shrink-0 md:block">
      <nav className="sticky top-4 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors ' +
                (isActive
                  ? 'bg-brand-subtle font-medium text-brand'
                  : 'text-ink-muted hover:bg-subtle hover:text-ink')
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
    <div className="min-w-0 flex-1">
      <Outlet />
    </div>
  </div>
);

export default AppSettings;
