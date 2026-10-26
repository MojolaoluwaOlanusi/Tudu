import React from 'react';

interface ChildrenProps {
  children: React.ReactNode;
}

export const H1: React.FC<ChildrenProps> = ({ children }) => (
  <h1 className="mb-4 font-handwritten text-4xl text-ink sm:text-5xl">
    {children}
  </h1>
);

export const H2: React.FC<ChildrenProps> = ({ children }) => (
  <h2 className="mb-3 mt-10 text-xl font-semibold text-ink">{children}</h2>
);

export const P: React.FC<ChildrenProps> = ({ children }) => (
  <p className="mb-4 text-[14px] leading-relaxed text-ink-muted">{children}</p>
);

export const UL: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="mb-4 space-y-2 text-[14px] leading-relaxed text-ink-muted">
    {items.map((it, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
        <span>{it}</span>
      </li>
    ))}
  </ul>
);

export const Code: React.FC<ChildrenProps> = ({ children }) => (
  <pre className="mb-4 overflow-x-auto rounded-lg border border-line bg-[#0A0A0C] p-3 font-mono text-[11.5px] leading-relaxed text-ink-muted">
    <code>{children}</code>
  </pre>
);

export const Kbd: React.FC<ChildrenProps> = ({ children }) => (
  <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink">
    {children}
  </kbd>
);