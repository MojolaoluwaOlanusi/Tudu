import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SidebarCollapsibleProps {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** A section header that shows/hides its children. Matches the mockup. */
const SidebarCollapsible: React.FC<SidebarCollapsibleProps> = ({
  title,
  badge,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line-subtle last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-subtle/50"
      >
        <ChevronDown
          className={
            'h-3 w-3 shrink-0 text-ink-faint transition-transform ' +
            (open ? '' : '-rotate-90')
          }
        />
        <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {title}
        </span>
        {badge != null && badge > 0 && (
          <span className="rounded-sm bg-line-subtle px-1.5 text-[10px] font-medium text-ink-faint tabular-nums">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
};

export default SidebarCollapsible;
