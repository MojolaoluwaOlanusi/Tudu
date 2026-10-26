import React from 'react';
import { MessageCircle, Github, ExternalLink } from 'lucide-react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, P } from '../../components/marketing/Prose';

const CommunityPage: React.FC = () => (
  <MarketingShell>
    <div className="mx-auto max-w-3xl px-6 py-16">
      <H1>Community</H1>
      <P>
        Builders, tinkerers, and people who care about a Kanban that does not get
        in the way.
      </P>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href="https://discord.gg/tudu"
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <MessageCircle className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink group-hover:text-brand">
            Discord
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Live chat with the team and other builders. Fastest way to get
            unstuck.
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted group-hover:text-brand">
            Join server <ExternalLink className="h-3 w-3" />
          </p>
        </a>

        <a
          href="https://github.com/tudu-app/tudu/discussions"
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <Github className="h-5 w-5" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink group-hover:text-brand">
            GitHub Discussions
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Feature requests, bug reports, and long-form conversation. Everything
            is public.
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted group-hover:text-brand">
            Open discussions <ExternalLink className="h-3 w-3" />
          </p>
        </a>
      </div>

      <div className="mt-10 rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink">Code of conduct</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
          Be kind, be specific, assume good faith. No spam, no self-promotion
          outside the &quot;show your work&quot; channel, no harassment of any
          kind.
        </p>
      </div>
    </div>
  </MarketingShell>
);

export default CommunityPage;