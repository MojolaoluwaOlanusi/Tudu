import React from 'react';
import { Link } from 'react-router-dom';
import Wordmark from '../common/Wordmark';

interface FooterSection {
  heading: string;
  links: { label: string; to: string }[];
}

const SECTIONS: FooterSection[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Boards & Kanban', to: '/docs/boards' },
      { label: 'Lists & filters', to: '/docs/lists' },
      { label: 'AI breakdown', to: '/docs/ai' },
      { label: 'Templates', to: '/docs/templates' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Freelancers', to: '/solutions/freelancers' },
      { label: 'Small teams', to: '/solutions/teams' },
      { label: 'Enterprise', to: '/solutions/enterprise' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Documentation', to: '/docs' },
      { label: 'Public API', to: '/docs/api' },
      { label: 'Webhooks', to: '/webhooks' },
      { label: 'Changelog', to: '/changelog' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'Help center', to: '/help' },
      { label: 'Community', to: '/community' },
      { label: 'Status', to: '/status' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
      { label: 'Contact', to: '/contact' },
    ],
  },
];

/**
 * Landing footer with the mockup's "half-in, half-out" wordmark finale.
 *
 * Technique (see readme/VISUAL_SYSTEM.md for the full spec):
 *   1. The theme-aware <Wordmark size="xl" /> PNG is absolutely positioned
 *      at the top of the footer with `-translate-y-1/2`. So its vertical
 *      centre sits exactly on the footer's top edge: the top half is above
 *      the footer, the bottom half is inside the footer's flow.
 *   2. A radial green glow is painted behind the checkstroke region of the
 *      PNG (left ~58%, top ~45%). This is what makes the green check "glow
 *      through" the glass panel below.
 *   3. The glass panel starts at exactly the footer's top edge and uses
 *      `backdrop-blur-2xl` + `backdrop-saturate-150` with a semi-transparent
 *      canvas background. Because `backdrop-filter` applies to whatever is
 *      painted behind the panel, the bottom half of the wordmark PNG is
 *      redrawn through the panel as a soft ghost — hence "half-in, half-out".
 *
 * All footer links go to real routes or ComingSoon stubs (registered in
 * App.tsx in Step 3); none is a dead href.
 */
const Footer: React.FC = () => (
  <footer className="relative overflow-visible">
    {/* Wordmark: half above the glass panel, half behind it. */}
    <div
      aria-hidden="true"
      data-testid="footer-wordmark-wrapper"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 flex -translate-y-1/2 justify-center"
    >
      <div className="relative">
        {/* Soft green glow centred over the PNG's checkstroke area. */}
        <div
          data-testid="footer-wordmark-glow"
          className="absolute left-[58%] top-[45%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-32 sm:w-32 md:h-40 md:w-40"
          style={{
            background:
              'radial-gradient(circle, rgba(34,197,94,0.55) 0%, transparent 65%)',
            filter: 'blur(24px)',
          }}
        />
        {/* Real PNG — theme-aware via Wordmark's useThemeStore source swap. */}
        <Wordmark size="xl" className="relative select-none" alt="Tudu" />
      </div>
    </div>

    {/* Glass panel: backdrop-filter blurs the bottom half of the wordmark. */}
    <div
      data-testid="footer-glass-panel"
      className="relative z-10 border-t border-line-subtle backdrop-blur-2xl backdrop-saturate-150"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-page) 70%, transparent)',
      }}
    >
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-32 sm:pt-40 md:pt-48">
        {/* Mobile: 2-column grid of sections. */}
        <div className="grid grid-cols-2 gap-8 md:hidden">
          {SECTIONS.map((sec) => (
            <div key={sec.heading}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {sec.heading}
              </p>
              <ul className="space-y-2">
                {sec.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-[12px] text-ink-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Desktop: brand column + five section columns. */}
        <div className="hidden gap-8 md:grid md:grid-cols-6">
          <div className="col-span-1">
            <p className="text-[13px] font-semibold text-ink">Tudu</p>
            <p className="mt-2 max-w-[180px] text-[11px] leading-relaxed text-ink-muted">
              Where simple boards become serious work.
            </p>
          </div>
          {SECTIONS.map((sec) => (
            <div key={sec.heading}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {sec.heading}
              </p>
              <ul className="space-y-2">
                {sec.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-[12px] text-ink-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line-subtle pt-6 text-[11px] text-ink-faint md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Tudu. All rights reserved.</p>
          <p className="text-center md:text-right">
            Made with <span className="text-brand">💖</span> in Ibadan.
            <span className="hidden sm:inline">
              {' '}
              No Trello or Jira were harmed — just built what they didn&apos;t.
            </span>
          </p>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;