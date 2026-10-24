import React, { useEffect, useState } from 'react';
import {
  usePublisherProfile,
  usePublisherBanks,
  useSavePublisherProfile,
} from '../../hooks/usePublisher';
import { useUiStore } from '../../store/uiStore';

interface PublisherSettingsProps {
  enabled: boolean;
}

/**
 * Payout settings for the template marketplace.
 *
 * A user who wants to sell paid templates must set up a Paystack
 * subaccount here. The form asks for a business name, a bank, and a
 * 10-digit account number. On submit, the backend creates a subaccount
 * with the 30/70 split; the resulting account_name (resolved by the
 * bank) is what appears on a buyer's receipt.
 */
const PublisherSettings: React.FC<PublisherSettingsProps> = ({ enabled }) => {
  const { data: profile, isLoading } = usePublisherProfile();
  const { data: banks = [] } = usePublisherBanks();
  const save = useSavePublisherProfile();
  const pushToast = useUiStore((s) => s.pushToast);

  const [businessName, setBusinessName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (profile && !profile.exists) setEditing(true);
  }, [profile]);

  if (!enabled) return null;
  if (isLoading) return <p className="text-sm text-ink-muted">Loading payout settings...</p>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate(
      { business_name: businessName, bank_code: bankCode, account_number: accountNumber },
      {
        onSuccess: () => {
          pushToast('Publisher account ready', 'success');
          setEditing(false);
          setBusinessName('');
          setBankCode('');
          setAccountNumber('');
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not save payout details', 'error');
        },
      }
    );
  };

  return (
    <section className="card mb-5 p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-handwritten text-xl text-ink">Sell templates</h2>
          <p className="mt-1 max-w-md text-xs text-ink-muted">
            Set up a payout account to sell paid templates in the marketplace.
            Tudu takes a 30% platform fee; you keep 70% of every sale.
          </p>
        </div>
      </div>

      {profile?.exists && !editing ? (
        <div className="space-y-2 text-sm">
          <p className="text-ink">
            <span className="text-ink-muted">Business: </span>
            {profile.business_name}
          </p>
          <p className="text-ink">
            <span className="text-ink-muted">Account: </span>
            {profile.account_name} · {profile.bank_name} {profile.account_number}
          </p>
          <p className="text-ink">
            <span className="text-ink-muted">Status: </span>
            <span className={profile.payout_status === 'active' ? 'text-accent-strong' : 'text-amber-400'}>
              {profile.payout_status || 'unknown'}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold text-ink-muted hover:border-accent hover:text-ink"
          >
            Change bank account
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Business name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              maxLength={255}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Bank
            </label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              required
              className="input w-full"
            >
              <option value="">Select a bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Account number
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              inputMode="numeric"
              placeholder="10-digit account number"
              className="input w-full font-mono"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Must match the business name on the account.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            {profile?.exists && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={
                save.isPending ||
                !businessName.trim() ||
                !bankCode ||
                accountNumber.length !== 10
              }
              className="btn-accent"
            >
              {save.isPending ? 'Saving...' : 'Save payout account'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default PublisherSettings;
