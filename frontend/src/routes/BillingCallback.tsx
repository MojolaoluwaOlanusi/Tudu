import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '../store/uiStore';

/**
 * Fallback landing page for when the inline popup is not used (either
 * because the browser blocked it, or because Paystack redirected here
 * after a retry). The webhook is the source of truth; this page only
 * invalidates the entitlements query so a pending upgrade shows up.
 */
const BillingCallback: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    const reference = params.get('reference') ?? params.get('trxref');
    if (reference) {
      pushToast('Payment received. Activating your subscription...', 'success');
    }
    const id = window.setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'entitlements'] });
      navigate('/settings/billing', { replace: true });
    }, 1500);
    return () => window.clearTimeout(id);
  }, [params, queryClient, navigate, pushToast]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        <p className="text-sm text-ink-muted">Finishing up...</p>
      </div>
    </div>
  );
};

export default BillingCallback;
