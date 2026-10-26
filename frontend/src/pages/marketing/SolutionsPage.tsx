import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, P } from '../../components/marketing/Prose';

interface SolutionFeature {
  title: string;
  desc: string;
}

interface Solution {
  eyebrow: string;
  title: string;
  tagline: string;
  features: SolutionFeature[];
  cta: string;
  ctaHref: string;
}

const CONTENT: Record<'freelancers' | 'teams' | 'enterprise', Solution> = {
  freelancers: {
    eyebrow: 'For freelancers',
    title: 'Ship client work without a project manager.',
    tagline:
      'One board per client. Time tracking built in. Invoice-ready exports.',
    features: [
      { title: 'Client boards', desc: 'One board per client with isolated columns.' },
      { title: 'Time tracking', desc: 'Log billable hours against any task. Export CSV.' },
      { title: 'Proposals that turn into tasks', desc: 'AI breakdown splits scope into checkable steps.' },
      { title: 'Templates', desc: 'Start from the Freelancer template in two clicks.' },
    ],
    cta: 'Start free',
    ctaHref: '/signup',
  },
  teams: {
    eyebrow: 'For small teams',
    title: 'One board your whole team actually opens.',
    tagline:
      'Workspaces, roles, real-time sync, and per-member analytics.',
    features: [
      { title: 'Workspaces', desc: 'Separate work per client, product line, or department.' },
      { title: 'Roles', desc: 'Admin, member, viewer. Enforced on every endpoint.' },
      { title: 'Shared boards', desc: 'Granular sharing with view or edit access.' },
      { title: 'Team analytics', desc: 'Per-member completion rates and burndown.' },
    ],
    cta: 'Start free',
    ctaHref: '/signup',
  },
  enterprise: {
    eyebrow: 'Coming soon',
    title: 'Compliance-grade Kanban.',
    tagline:
      'SAML SSO, SCIM, audit logs, on-prem deployment. Contact us to be first in line.',
    features: [
      { title: 'SAML SSO', desc: 'Okta, Azure AD, Google Workspace.' },
      { title: 'SCIM provisioning', desc: 'Auto-sync users from your IdP.' },
      { title: 'Audit log export', desc: 'Every action, signed and exportable.' },
      { title: 'On-prem', desc: 'Run Tudu behind your firewall with a self-hosted license.' },
    ],
    cta: 'Contact sales',
    ctaHref: '/contact',
  },
};

const SolutionsPage: React.FC = () => {
  const { slug } = useParams();
  const key: 'freelancers' | 'teams' | 'enterprise' =
    slug === 'freelancers' || slug === 'teams' || slug === 'enterprise'
      ? slug
      : 'teams';
  const solution = CONTENT[key];

  return (
    <MarketingShell>
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          {solution.eyebrow}
        </p>
        <H1>{solution.title}</H1>
        <P>{solution.tagline}</P>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {solution.features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-line bg-surface p-5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-subtle text-brand">
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">
                {feature.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link
            to={solution.ctaHref}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-hover"
          >
            {solution.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
};

export default SolutionsPage;