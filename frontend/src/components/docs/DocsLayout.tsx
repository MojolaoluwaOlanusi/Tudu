import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { DOCS, DOC_ORDER } from '../../lib/docsData';

interface DocsLayoutProps {
  children: React.ReactNode;
}

const DocsLayout: React.FC<DocsLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [query, setQuery] = useState('');

  let activeKey = 'index';
  if (location.pathname === '/webhooks') activeKey = 'webhooks';
  else if (location.pathname.startsWith('/docs/')) {
    activeKey = location.pathname.slice('/docs/'.length);
  }

  const filteredOrder = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOC_ORDER;
    return DOC_ORDER.filter((key) => {
      const doc = DOCS[key];
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.intro.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const docHref = (key: string): string =>
    key === 'webhooks'
      ? '/webhooks'
      : key === 'index'
        ? '/docs'
        : '/docs/' + key;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/*
        Mobile-only docs navigation.
        The sidebar below is `hidden md:block`, so without this a phone
        user on /docs can only see the current doc — there is no way to
        jump to another one. Mirrors the horizontal-tab pattern already
        used by the settings pages on mobile.
      */}
      <nav aria-label="Docs sections" className="mb-6 md:hidden">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs"
            aria-label="Search docs"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scroll-hidden">
          {filteredOrder.map((key) => {
            const doc = DOCS[key];
            const active = activeKey === key;
            return (
              <Link
                key={key}
                to={docHref(key)}
                aria-current={active ? 'page' : undefined}
                className={
                  'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ' +
                  (active
                    ? 'border-brand/40 bg-brand-subtle text-brand'
                    : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink')
                }
              >
                {doc.title}
              </Link>
            );
          })}
          {filteredOrder.length === 0 && (
            <p className="px-2 py-1 text-[12px] text-ink-faint">No matches.</p>
          )}
        </div>
      </nav>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-20">
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
            <nav className="space-y-0.5">
              {filteredOrder.map((key) => {
                const doc = DOCS[key];
                const active = activeKey === key;
                return (
                  <Link
                    key={key}
                    to={docHref(key)}
                    className={
                      'block rounded-md px-2.5 py-1.5 text-[13px] transition-colors ' +
                      (active
                        ? 'bg-brand-subtle text-brand'
                        : 'text-ink-muted hover:bg-subtle hover:text-ink')
                    }
                  >
                    {doc.title}
                  </Link>
                );
              })}
            </nav>
            {filteredOrder.length === 0 && (
              <p className="px-2.5 py-2 text-[12px] text-ink-faint">
                No matches.
              </p>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
};

export default DocsLayout;
