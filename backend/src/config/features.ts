/**
 * The single source of truth for what each tier unlocks.
 *
 * Read by requireFeature on the backend and, later, by FeatureGate on the
 * frontend. A flag lives here, not scattered through controllers, so
 * changing what Pro includes is a one-line edit.
 */
export type Tier = 'free' | 'pro' | 'enterprise';

export const FEATURES = {
  'ai.breakdown':        { free: true,  pro: true,  enterprise: true },
  'ai.breakdown.hd':     { free: false, pro: true,  enterprise: true },
  'filters.power':       { free: true,  pro: true,  enterprise: true },
  'templates.builtin':   { free: true,  pro: true,  enterprise: true },
  'templates.publish':   { free: false, pro: true,  enterprise: true },
  'api.public.read':     { free: true,  pro: true,  enterprise: true },
  'api.public.write':    { free: false, pro: true,  enterprise: true },
  'integrations.github': { free: false, pro: true,  enterprise: true },
  'integrations.slack':  { free: false, pro: true,  enterprise: true },
  'push.notifications':  { free: false, pro: true,  enterprise: true },
  'analytics.team':      { free: false, pro: true,  enterprise: true },
  'time.tracking':       { free: false, pro: true,  enterprise: true },
  'selfHost.license':    { free: false, pro: true,  enterprise: true },
  'sso.saml':            { free: false, pro: false, enterprise: true },
  'scim.provisioning':   { free: false, pro: false, enterprise: true },
  'audit.export':        { free: false, pro: false, enterprise: true },
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const tierHasFeature = (
  tier: Tier | null | undefined,
  feature: FeatureKey
): boolean => {
  const t: Tier = tier ?? 'free';
  return FEATURES[feature][t];
};
