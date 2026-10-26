import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, P } from '../../components/marketing/Prose';

interface Post {
  slug: string;
  tag: string;
  date: string;
  title: string;
  excerpt: string;
}

const POSTS: Post[] = [
  {
    slug: 'real-time-sync',
    tag: 'Engineering',
    date: 'Oct 2025',
    title: 'How we built real-time sync across every device',
    excerpt:
      'Socket.io + optimistic updates + a queue that survives offline. Here is the exact pattern that keeps your board in sync when the network flickers.',
  },
  {
    slug: 'ai-breakdown',
    tag: 'Product',
    date: 'Sep 2025',
    title: 'AI breakdown: from "Plan launch" to a real checklist',
    excerpt:
      'Why we ship AI as a side-by-side reference, not a full replacement. The UX we landed on, and the two things we tried first that did not work.',
  },
  {
    slug: 'keyboard-first',
    tag: 'Design',
    date: 'Aug 2025',
    title: 'Keyboard-first, mouse-friendly: the Tudu shortcut grammar',
    excerpt:
      'Every action reachable in two keystrokes. G L, N, Cmd+K, and why we resisted the temptation to add a shortcut for everything.',
  },
  {
    slug: 'self-hosting',
    tag: 'Product',
    date: 'Jul 2025',
    title: 'Self-hosting a real Kanban on a Raspberry Pi',
    excerpt:
      'Postgres + Node + one Docker Compose file. How to run Tudu on hardware that fits in your pocket, and why we license it that way.',
  },
];

const BlogPage: React.FC = () => (
  <MarketingShell>
    <div className="mx-auto max-w-4xl px-6 py-16">
      <H1>Blog &amp; updates</H1>
      <P>Product thinking, engineering notes, and the occasional hot take.</P>

      <div className="mt-10 space-y-3">
        {POSTS.map((p) => (
          <article
            key={p.slug}
            className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 font-semibold text-brand">
                {p.tag}
              </span>
              <span className="text-ink-faint">{p.date}</span>
            </div>
            <h2 className="text-lg font-semibold text-ink transition-colors group-hover:text-brand">
              {p.title}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              {p.excerpt}
            </p>
            <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted transition-colors group-hover:text-brand">
              Read more <ArrowRight className="h-3 w-3" />
            </p>
          </article>
        ))}
      </div>

      <div className="mt-12 text-center text-[11px] text-ink-faint">
        Coming soon — full posts will be published as individual articles. In
        the meantime, reach us from{' '}
        <Link to="/contact" className="underline hover:text-ink">
          the contact page
        </Link>
        .
      </div>
    </div>
  </MarketingShell>
);

export default BlogPage;