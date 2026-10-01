import express from 'express';
import passport from '../config/passport';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Email authentication
router.post('/register', authController.emailRegister);
router.post('/login', authController.emailLogin);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  authController.googleCallback
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  authController.githubCallback
);

// Get current user
router.get('/me', authenticate, authController.getMe);

// Logout
router.post('/logout', authController.logout);

export default router;
