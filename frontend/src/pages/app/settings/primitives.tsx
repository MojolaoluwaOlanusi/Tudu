import React from 'react';

export const PageHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <div className="mb-6">
    <h1 className="font-handwritten text-3xl text-ink">{title}</h1>
    {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
  </div>
);

export const Section: React.FC<{ title?: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="mb-4 rounded-xl border border-line bg-surface p-4">
    {title && <h2 className="mb-1 font-handwritten text-xl text-ink">{title}</h2>}
    {description && <p className="mb-3 text-xs text-ink-muted">{description}</p>}
    {children}
  </section>
);

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="mb-3">
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
  </div>
);

export const ToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, onChange, disabled }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-subtle bg-canvas p-2.5">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="mt-0.5 h-4 w-4 accent-brand"
    />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-ink">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>}
    </span>
  </label>
);

export const Avatar: React.FC<{
  name?: string | null;
  email?: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, email, url, size = 'md' }) => {
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  const initial = (name || email || '?').charAt(0).toUpperCase();
  return url ? (
    <img
      src={url}
      alt={name || email || ''}
      className={`${sizes[size]} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-ink-inverse`}>
      {initial}
    </span>
  );
};

export const Pill: React.FC<{
  tone?: 'brand' | 'muted' | 'danger' | 'warn';
  children: React.ReactNode;
}> = ({ tone = 'muted', children }) => {
  const tones = {
    brand: 'bg-brand-subtle text-brand',
    muted: 'bg-raised text-ink-muted',
    danger: 'bg-red-500/15 text-red-400',
    warn: 'bg-amber-400/15 text-amber-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
};
