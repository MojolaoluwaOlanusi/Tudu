import express, { Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { handleIntegrationCallback } from '../controllers/githubController';

const router = express.Router();

/**
 * Refuse the route with a clear 503 when the provider is not configured
 * on this server.
 *
 * Before this guard, hitting /auth/google on an instance without OAuth
 * credentials would throw "Unknown authentication strategy" from Passport
 * and surface as an unhelpful 500. Now the frontend (and curl) get a body
 * that names the missing env vars.
 */
const oauthConfigured =
  (provider: 'google' | 'github') =>
  (req: Request, res: Response, next: NextFunction) => {
    const ok =
      provider === 'google'
        ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
        : Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    if (ok) return next();
    res.status(503).json({
      error:
        provider === 'google'
          ? 'Google sign-in is not configured on this server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)'
          : 'GitHub sign-in is not configured on this server (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)',
    });
  };

// Email authentication
router.post('/register', authController.emailRegister);
router.post('/login', authController.emailLogin);

// Google OAuth
router.get(
  '/google',
  oauthConfigured('google'),
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/google/callback',
  oauthConfigured('google'),
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  authController.googleCallback
);

// GitHub OAuth
router.get(
  '/github',
  oauthConfigured('github'),
  passport.authenticate('github', { scope: ['user:email'] })
);
router.get(
  '/github/callback',
  oauthConfigured('github'),
  (req, res, next) => {
    const state = req.query.state;
    if (typeof state === 'string' && state.startsWith('tudu-int.')) {
      void handleIntegrationCallback(req, res);
      return;
    }
    next();
  },
  passport.authenticate('github', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  authController.githubCallback
);

// Get current user
router.get('/me', authenticate, authController.getMe);

// Logout
router.post('/logout', authController.logout);

export default router;