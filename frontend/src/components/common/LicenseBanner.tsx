import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicenseStatus } from '../../hooks/useLicense';

/**
 * A slim strip under the header that appears when this instance is
 * self-hosted and has no valid license.
 *
 * Returns null in three cases, all silently:
 *   - the license status has not loaded yet,
 *   - the instance is cloud (nothing to install), or
 *   - the license is valid.
 *
 * Not dismissable on purpose. The unlicensed state is a real problem
 * the operator needs to fix; a "dismiss for a while" would let a
 * self-hoster forget why half the app is locked.
 */
const LicenseBanner: React.FC = () => {
  const { data } = useLicenseStatus();
  const navigate = useNavigate();

  if (!data || data.mode !== 'self_hosted') return null;
  if (data.current?.valid) return null;

  // Two distinct states get the same visual treatment but different
  // copy: nothing installed at all, versus something installed that
  // does not validate. The second one is more urgent because the
  // operator thought they were done.
  const isPresent = !!data.current?.present;
  const message = isPresent
    ? 'The installed license is not valid. Check it in Settings.'
    : 'This self-hosted instance has no license. Pro features are locked.';

  return (
    <div
      className="border-b border-amber-400/40 bg-amber-400/10"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-amber-500"
            aria-hidden="true"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="min-w-0 text-xs text-amber-500">
            <span className="font-semibold">
              {isPresent ? 'Invalid license' : 'Unlicensed instance'}
            </span>
            <span className="ml-1.5 text-ink-muted">{message}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/settings/license')}
          className="shrink-0 rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-500 transition-colors hover:bg-amber-400/20"
        >
          {isPresent ? 'Fix license' : 'Install license'} →
        </button>
      </div>
    </div>
  );
};

export default LicenseBanner;
