import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Activity } from 'lucide-react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, P } from '../../components/marketing/Prose';

const CONTACT_EMAIL = 'olanusimojola@gmail.com';

/**
 * Contact page. The form opens the user's own email client via a
 * mailto: link with the fields pre-filled — no backend endpoint is
 * involved, so there is nothing to pretend works when it doesn't.
 */
const ContactPage: React.FC = () => {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    const subject = encodeURIComponent('Tudu contact from ' + name);
    const body = encodeURIComponent(message + '\n\n— ' + name + ' <' + email + '>');
    window.location.href =
      'mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body;
    setSent(true);
  };

  return (
    <MarketingShell>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <H1>Contact us</H1>
          <P>
            We read every message. Response time is usually one business day.
          </P>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Email</p>
                <a
                  href={'mailto:' + CONTACT_EMAIL}
                  className="mt-0.5 block text-[12px] text-ink-muted hover:text-brand"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>

            <Link
              to="/status"
              className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand">
                <Activity className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Status page</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  Live uptime and incidents
                </p>
              </div>
            </Link>

            <Link
              to="/community"
              className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Community</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  Discord and GitHub Discussions
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-3">
          {sent ? (
            <div className="rounded-xl border border-brand/30 bg-brand-subtle/20 p-8 text-center">
              <p className="text-base font-semibold text-ink">
                Your email client should open.
              </p>
              <p className="mt-2 text-[13px] text-ink-muted">
                If nothing opened, email us directly at{' '}
                <a
                  href={'mailto:' + CONTACT_EMAIL}
                  className="font-medium text-ink underline hover:text-brand"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setMessage('');
                }}
                className="btn-ghost mt-5"
              >
                Send another
              </button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="rounded-xl border border-line bg-surface p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="label">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="label">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="contact-msg" className="label">
                  Message
                </label>
                <textarea
                  id="contact-msg"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input resize-none"
                  required
                />
              </div>
              <button type="submit" className="btn-accent brush-stroke mt-4">
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </MarketingShell>
  );
};

export default ContactPage;