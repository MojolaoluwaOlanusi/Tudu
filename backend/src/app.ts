import express, { Application, Request } from 'express';
import net from 'net';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import dotenv from 'dotenv';
import passport from './config/passport';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import shareRoutes, { sharedListsRouter } from './routes/share';
import userRoutes from './routes/users';
import activityRoutes from './routes/activity';
import userRoutes from './routes/users';\nimport activityRoutes from './routes/activity';\nimport aiRoutes from './routes/ai';\nimport pomodoroRoutes from './routes/pomodoro';\nimport analyticsRoutes from './routes/analytics';\nimport { boardsRouter, columnsRouter } from './routes/boards';\nimport { workspacesRouter } from './routes/workspaces';
import aiRoutes from './routes/ai';
import pomodoroRoutes from './routes/pomodoro';
import analyticsRoutes from './routes/analytics';
import { boardsRouter, columnsRouter } from './routes/boards';

dotenv.config();

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Session configuration for passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

/* ------------------------------------------------------------------------ */
/* Rate limiting                                                            */
/* ------------------------------------------------------------------------ */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Render (and most hosts) terminate TLS behind a reverse proxy. Without this,
// Express reports the *proxy's* IP as `req.ip`, so every visitor would share a
// single rate-limit bucket and the whole app would 429 for everyone at once.
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

/**
 * IPv6 subscribers are normally handed a whole /64, so a single client could
 * rotate addresses to dodge the limit. Collapse IPv6 to its /64 prefix.
 */
const clientKey = (req: Request): string => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return net.isIPv6(ip) ? ip.split(':').slice(0, 4).join(':') : ip;
};

// General API protection. Only *failed* requests count towards the limit, so
// ordinary usage can never trip it.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 300 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: clientKey,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// The auth routes were previously unprotected - brute force and mass signups
// had no limit at all.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 60 : 1_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: { error: 'Too many attempts, please try again later.' },
});
app.use('/auth', authLimiter);

// Much tighter limit on the credential endpoints themselves (every attempt
// counts here, successful ones included, so guessing cannot succeed).
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PRODUCTION ? 10 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  message: { error: 'Too many sign-in attempts, please try again later.' },
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Credential endpoints get the strict limiter. Registered before the auth
// router so the limiter runs first.
app.post('/auth/login', credentialLimiter);
app.post('/auth/register', credentialLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/shared-lists', sharedListsRouter);
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/boards', boardsRouter);
app.use('/api/columns', columnsRouter);

export default app;
