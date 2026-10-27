import React from 'react';
import { Link, useParams } from 'react-router-dom';
import MarketingShell from '../../components/marketing/MarketingShell';
import DocsLayout from '../../components/docs/DocsLayout';
import { DOCS, DOC_ORDER, type DocKey } from '../../lib/docsData';
import { H1, H2, P, UL, Code } from '../../components/marketing/Prose';

interface DocsPageProps {
  /**
   * Force a specific slug regardless of the URL. Used by /webhooks, which
   * is the same page shape but its own route.
   */
  forcedSlug?: string;
}

const isDocKey = (value: string): value is DocKey =>
  (DOC_ORDER as readonly string[]).includes(value);

const DocsPage: React.FC<DocsPageProps> = ({ forcedSlug }) => {
  const { slug } = useParams();
  const key = forcedSlug ?? slug;

  // /docs renders the index doc; any unknown slug renders a real 404.
  // Previously `findDoc` fell back to the index, so /docs/typo silently
  // showed "Welcome to Tudu" under the wrong URL — misleading and bad SEO.
  const doc = key === undefined ? DOCS.index : isDocKey(key) ? DOCS[key] : null;

  if (!doc) {
    return (
      <MarketingShell>
        <DocsLayout>
          <article className="max-w-3xl">
            <H1>Page not found</H1>
            <P>That doc page does not exist. Pick one from the navigation.</P>
            <Link
              to="/docs"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Back to docs
            </Link>
          </article>
        </DocsLayout>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <DocsLayout>
        <article className="max-w-3xl">
          <H1>{doc.title}</H1>
          <P>{doc.intro}</P>
          {doc.sections.map((sec, i) => (
            <section key={i}>
              {sec.heading && <H2>{sec.heading}</H2>}
              {sec.paragraphs &&
                sec.paragraphs.map((p, j) => <P key={j}>{p}</P>)}
              {sec.bullets && <UL items={sec.bullets} />}
              {sec.code && <Code>{sec.code}</Code>}
            </section>
          ))}
        </article>
      </DocsLayout>
    </MarketingShell>
  );
};

export default DocsPage;