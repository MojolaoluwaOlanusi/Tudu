import React, { type ReactNode } from 'react';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  /** Shown instead of the children when the flag is off. */
  fallback?: ReactNode;
  /** The card title. Used when no custom fallback is provided. */
  title?: string;
  /** The card description. Used when no custom fallback is provided. */
  description?: string;
  /** Compact prompt variant. */
  compact?: boolean;
}

/**
 * Wrap any subtree in a feature check.
 *
 * Rendering is all-or-nothing: until the entitlements query resolves, the
 * gate renders the fallback. That avoids a Pro user seeing the free-tier
 * placeholder on every refresh if the free tier is what renders first.
 *
 * Example:
 *   <FeatureGate
 *     feature="ai.breakdown.hd"
 *     title="Deeper AI breakdown"
 *     description="Up to 12 sub-tasks instead of 6."
 *   >
 *     <HdBreakdownButton />
 *   </FeatureGate>
 */
const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  title,
  description,
  compact,
}) => {
  const hasFeature = useFeatureFlag(feature);
  if (hasFeature) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return (
    <UpgradePrompt
      title={title ?? 'This feature requires Pro'}
      description={description}
      compact={compact}
    />
  );
};

export default FeatureGate;
