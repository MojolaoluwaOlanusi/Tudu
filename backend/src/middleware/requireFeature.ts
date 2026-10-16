import { Request, Response, NextFunction } from 'express';
import { getEntitlements } from '../services/entitlementService';
import { tierHasFeature, type FeatureKey } from '../config/features';

interface RequireFeatureOptions {
  upgradePath?: string;
}

/**
 * Gate a route on a feature flag.
 *
 * On a missing feature the response is 402 with a body that names the
 * feature and points at the upgrade page. The frontend uses the body,
 * not the code, to decide what to render.
 */
export const requireFeature =
  (feature: FeatureKey, options: RequireFeatureOptions = {}) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const ent = await getEntitlements(userId);
      if (tierHasFeature(ent.tier, feature)) {
        next();
        return;
      }
      res.status(402).json({
        error: 'This feature requires a higher tier',
        feature,
        currentTier: ent.tier,
        upgrade_url: options.upgradePath ?? '/pricing',
      });
    } catch (error) {
      console.error('Error checking feature:', error);
      res.status(500).json({ error: 'Failed to check entitlements' });
    }
  };
