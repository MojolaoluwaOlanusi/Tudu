import React from 'react';
import { TeamRole } from '../../types/board';

interface MemberBadgeProps {
  name: string;
  role: TeamRole;
  size?: 'sm' | 'md' | 'lg';
  showRole?: boolean;
}

const roleStyles: Record<
  TeamRole,
  {
    badge: string;
    label: string;
    dot: string;
  }
> = {
  admin: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    label: 'Admin',
    dot: 'bg-red-500',
  },
  member: {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    label: 'Member',
    dot: 'bg-blue-500',
  },
  viewer: {
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    label: 'Viewer',
    dot: 'bg-gray-400',
  },
};

const sizeClasses = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

const MemberBadge: React.FC<MemberBadgeProps> = ({
  name,
  role,
  size = 'md',
  showRole = true,
}) => {
  const styles = roleStyles[role];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${styles.badge} ${sizeClasses[size]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {name}
      {showRole && <span className="hidden sm:inline">({styles.label})</span>}
    </span>
  );
};

export default MemberBadge;
