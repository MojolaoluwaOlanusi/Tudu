import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === 'test' ? 2 : 10,
  // Give Neon more room to wake from suspend before giving up.
  connectionTimeoutMillis: 30_000,
  // TCP keepalive prevents the socket from being closed for being idle
  // between global setup and the first worker query.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

export default pool;
