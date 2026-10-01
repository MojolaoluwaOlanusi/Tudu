import React from 'react';
import { SharedUser } from '../../types/share';

interface AvatarProps {
  user?: SharedUser;
  size?: string;
}

/** Collaborator avatar with an initials fallback. */
const Avatar: React.FC<AvatarProps> = ({ user, size = 'h-9 w-9' }) =>
  user?.avatar_url ? (
    <img
      src={user.avatar_url}
      alt={user.name || user.email}
      className={`${size} shrink-0 rounded-full object-cover ring-2 ring-accent`}
    />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white`}
    >
      {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
    </span>
  );

export default Avatar;