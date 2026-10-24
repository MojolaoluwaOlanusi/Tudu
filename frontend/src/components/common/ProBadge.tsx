import React from 'react';

interface ProBadgeProps {
  /** Optional label. Defaults to "Pro". */
  label?: string;
  className?: string;
}

/**
 * A small "Pro" pill for marking features that require an upgrade.
 *
 * Restyled in Step 13 to match the mockup's inline badge pattern
 * (`bg-brand/15 text-brand rounded-sm text-[9px] tracking-wider`), the same
 * one used on the Topbar Pro chip and the bento Pro badges. Inline text
 * rather than a block so it can sit next to a heading or a button label
 * without re-flowing the layout.
 */
const ProBadge: React.FC<ProBadgeProps> = ({ label = 'Pro', className = '' }) => (
  <span
    className={
      'ml-1.5 inline-flex items-center rounded-sm bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand ' +
      className
    }
  >
    {label}
  </span>
);

export default ProBadge;