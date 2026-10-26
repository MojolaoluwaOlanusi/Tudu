import React from 'react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, H2, P, UL } from '../../components/marketing/Prose';

interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalContent {
  title: string;
  updated: string;
  sections: LegalSection[];
}

const CONTENT: Record<'privacy' | 'terms', LegalContent> = {
  privacy: {
    title: 'Privacy policy',
    updated: 'October 22, 2026',
    sections: [
      {
        heading: 'What we collect',
        bullets: [
          'Account details: name, email, avatar (optional)',
          'Content you create: boards, tasks, subtasks, comments',
          'Usage data: page views, feature toggles, error reports',
          'Payment metadata from Paystack (we never see raw card data)',
        ],
      },
      {
        heading: 'What we do not collect',
        paragraphs: [
          'We do not track you across other apps, sell data to advertisers, or fingerprint your device. There are no third-party ad trackers on tudu.app.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Export or delete your account at any time from Settings > Account. Deleting removes all your boards, tasks, and focus sessions permanently within 30 days. Backups expire in 90 days.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    updated: 'October 22, 2026',
    sections: [
      {
        heading: 'Using Tudu',
        paragraphs: [
          'Use Tudu for lawful purposes only. Do not attempt to reverse-engineer the hosted service, scrape other users boards, or abuse the API.',
        ],
      },
      {
        heading: 'Plans and billing',
        bullets: [
          'Free tier: no card required, no time limit',
          'Pro tier: billed monthly or yearly, cancel any time',
          'Refunds: unused months are refunded on request within 30 days',
          'Self-hosting: perpetual license, no recurring fee',
        ],
      },
      {
        heading: 'Content ownership',
        paragraphs: [
          'You own everything you create in Tudu. We have no license to use it beyond what is necessary to operate the service.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'Tudu is provided as-is. Back up important work. Our aggregate liability is limited to the amount you paid us in the last 12 months.',
        ],
      },
    ],
  },
};

interface LegalPageProps {
  mode?: 'privacy' | 'terms';
}

const LegalPage: React.FC<LegalPageProps> = ({ mode = 'privacy' }) => {
  const content = CONTENT[mode] ?? CONTENT.privacy;
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <H1>{content.title}</H1>
        <P>Last updated: {content.updated}</P>
        {content.sections.map((sec, i) => (
          <section key={i}>
            <H2>{sec.heading}</H2>
            {sec.paragraphs && sec.paragraphs.map((p, j) => <P key={j}>{p}</P>)}
            {sec.bullets && <UL items={sec.bullets} />}
          </section>
        ))}
        <div className="mt-12 border-t border-line-subtle pt-6 text-[12px] text-ink-faint">
          Questions? Email{' '}
          <a
            href="mailto:olanusimojola@gmail.com"
            className="underline hover:text-ink"
          >
            olanusimojola@gmail.com
          </a>
          .
        </div>
      </div>
    </MarketingShell>
  );
};

export default LegalPage;