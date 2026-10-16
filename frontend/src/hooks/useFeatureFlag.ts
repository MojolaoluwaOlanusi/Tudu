import { useEntitlements } from './useBilling';

/**
 * Read a single feature flag.
 *
 * Returns false until the entitlements query resolves, so a Pro user
 * who refreshes sees a brief flash of the locked state rather than a
 * brief flash of the unlocked state. That ordering is deliberate: it
 * is better to briefly hide a feature from someone who has it than to
 * briefly show it to someone who does not.
 */
export const useFeatureFlag = (feature: string): boolean => {
  const { data } = useEntitlements();
  return data?.features?.[feature] === true;
};
