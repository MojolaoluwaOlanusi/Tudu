import React, { useRef } from 'react';
import { useInView } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Detects when a tile enters the viewport so its demo loop only runs
 * while visible. `once: false` means the loop stops when scrolled away
 * and restarts when the tile comes back — cheap enough for 16 tiles.
 */
export function useTileInView() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: '-80px', once: false });
  return { ref, inView };
}

interface TileHeaderProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string;
  hint?: string;
}

export const TileHeader: React.FC<TileHeaderProps> = ({ title, icon, badge, hint }) => (
  <div className="flex items-start justify-between gap-2">
    <div className="flex min-w-0 items-center gap-2">
      {icon && <span className="shrink-0 text-ink-muted">{icon}</span>}
      <h3 className="truncate text-[13px] font-semibold text-ink">{title}</h3>
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      {hint && (
        <span className="rounded-sm border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
          {hint}
        </span>
      )}
      {badge && (
        <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand">
          {badge}
        </span>
      )}
    </div>
  </div>
);

export const Cursor: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={twMerge(
      'ml-0.5 inline-block h-3 w-px animate-pulse bg-brand align-middle',
      className,
    )}
  />
);