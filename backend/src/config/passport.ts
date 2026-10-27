import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import pool from './database';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

/**
 * OAuth strategies are registered only when BOTH credentials are set.
 *
 * passport-google-oauth20 and passport-github2 throw at construction time
 * when clientID is empty, so the previous `|| ''` fallback crashed the
 * process on boot with "OAuth2Strategy requires a clientID option".
 * That crashed self-hosted instances without OAuth (email/password-only)
 * and every backend integration test in CI (which has no .env).
 *
 * Skipping the strategy is the right behaviour: the /auth/google and
 * /auth/github routes now return a clear 503 (see routes/auth.ts) instead
 * of a 500, and email/password sign-in keeps working.
 */

function registerGoogle(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:5000/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value || (profile as any)._json?.email;
          if (!email) {
            return done(new Error('No email in Google profile'));
          }

          const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
          );
          if (existingUser.rows.length > 0) {
            return done(null, existingUser.rows[0]);
          }

          const newUser = await pool.query(
            `INSERT INTO users (email, name, provider, provider_id, avatar_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              email,
              profile.displayName || profile.name?.givenName,
              'google',
              profile.id,
              profile.photos?.[0]?.value,
            ]
          );
          return done(null, newUser.rows[0]);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

function registerGitHub(): void {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL ||
          'http://localhost:5000/auth/github/callback',
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: any,
        done: (error: any, user?: any) => void
      ) => {
        try {
          const email =
            profile.emails?.[0]?.value || (profile as any)._json?.email;
          if (!email) {
            return done(new Error('No email in GitHub profile'));
          }

          const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
          );
          if (existingUser.rows.length > 0) {
            return done(null, existingUser.rows[0]);
          }

          const newUser = await pool.query(
            `INSERT INTO users (email, name, provider, provider_id, avatar_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              email,
              profile.displayName || profile.username,
              'github',
              profile.id,
              profile.photos?.[0]?.value,
            ]
          );
          return done(null, newUser.rows[0]);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

const googleIdSet = Boolean(process.env.GOOGLE_CLIENT_ID);
const googleSecretSet = Boolean(process.env.GOOGLE_CLIENT_SECRET);
if (googleIdSet && googleSecretSet) {
  registerGoogle();
} else if (googleIdSet || googleSecretSet) {
  console.warn(
    '[passport] Google OAuth partially configured (only one of GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET is set). Google sign-in is disabled.'
  );
} else {
  console.info('[passport] Google OAuth not configured. Google sign-in disabled.');
}

const githubIdSet = Boolean(process.env.GITHUB_CLIENT_ID);
const githubSecretSet = Boolean(process.env.GITHUB_CLIENT_SECRET);
if (githubIdSet && githubSecretSet) {
  registerGitHub();
} else if (githubIdSet || githubSecretSet) {
  console.warn(
    '[passport] GitHub OAuth partially configured (only one of GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET is set). GitHub sign-in is disabled.'
  );
} else {
  console.info('[passport] GitHub OAuth not configured. GitHub sign-in disabled.');
}

export default passport;