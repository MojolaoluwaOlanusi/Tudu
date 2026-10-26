import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Keyboard,
  Timer,
  Sparkles,
  Code2,
  Users,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, P } from '../../components/marketing/Prose';

interface Topic {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

const TOPICS: Topic[] = [
  { icon: BookOpen, title: 'Basics', description: 'Boards, lists, tasks, subtasks, filters.', href: '/docs/boards' },
  { icon: Keyboard, title: 'Keyboard', description: 'Shortcuts, palette, navigation, density.', href: '/docs/shortcuts' },
  { icon: Timer, title: 'Focus', description: 'Pomodoro, time tracking, weekly report.', href: '/docs/pomodoro' },
  { icon: Sparkles, title: 'AI & NLP', description: 'Breakdown, natural-language parsing.', href: '/docs/ai' },
  { icon: Code2, title: 'Developers', description: 'Public API, webhooks, tokens.', href: '/docs/api' },
  { icon: Users, title: 'Teams', description: 'Workspaces, roles, shared boards.', href: '/solutions/teams' },
  { icon: CreditCard, title: 'Billing', description: 'Plans, invoices, credits.', href: '/pricing' },
  { icon: LifeBuoy, title: 'Contact', description: 'Reach the humans.', href: '/contact' },
];

const HelpPage: React.FC = () => (
  <MarketingShell>
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="max-w-2xl">
        <H1>Help center</H1>
        <P>Guides, shortcuts, and answers to the questions we get most.</P>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.title}
              to={t.href}
              className="group rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-subtle text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-medium text-ink group-hover:text-brand">
                {t.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                {t.description}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mt-14 rounded-lg border border-line bg-surface p-6">
        <p className="text-base font-semibold text-ink">Still stuck?</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          Email us at{' '}
          <a
            href="mailto:olanusimojola@gmail.com"
            className="text-brand hover:underline"
          >
            olanusimojola@gmail.com
          </a>{' '}
          — we reply in a business day. Or check the{' '}
          <Link to="/status" className="text-brand hover:underline">
            status page
          </Link>
          .
        </p>
      </div>
    </div>
  </MarketingShell>
);

export default HelpPage;