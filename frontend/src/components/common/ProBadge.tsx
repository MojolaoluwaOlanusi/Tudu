import React from 'react';

interface ProBadgeProps {
  /** Optional label. Defaults to "Pro". */
  label?: string;
  className?: string;
}

/**
 * A small "Pro" pill for marking features that require an upgrade.
 *
 * Inline text rather than a block so it can sit next to a heading or a
 * button label without re-flowing the layout.
 */
const ProBadge: React.FC<ProBadgeProps> = ({ label = 'Pro', className = '' }) => (
  <span
    className={
      'ml-1.5 inline-flex items-center rounded-full border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-strong ' +
      className
    }
  >
    {label}
  </span>
);

export default ProBadge;
