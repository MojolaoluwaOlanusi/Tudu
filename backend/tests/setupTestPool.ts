import pool from '../src/config/database';

/**
 * Warm the connection pool inside the Jest worker.
 *
 * `globalSetup` runs in the main Jest process, whose pool is separate from
 * every worker's. A warm-up there proves Neon is awake but leaves each
 * worker to cold-start its own connection. `setupFilesAfterEnv` runs per
 * worker, so the pool a test file actually uses is the one this warms.
 *
 * Retries handle the case where Neon's compute went to sleep since the
 * previous test file: the first connection attempt can fail while the
 * compute is waking, and a second attempt a moment later succeeds.
 */
beforeAll(async () => {
  const attempts = 5;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}, 60_000);