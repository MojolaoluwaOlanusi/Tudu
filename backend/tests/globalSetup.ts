import pool from '../src/config/database';

/**
 * Runs once before any test file.
 *
 * Neon suspends compute on idle; the first connection after a pause can take
 * 10-30 seconds to authenticate. A fresh pool opened by a test file has no
 * way to know that and times out. A single warm-up here, with retries, means
 * every test file that follows finds the compute already awake.
 */
export default async () => {
  const attempts = 5;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await pool.query('SELECT 1');
      // Leave the connection open for the first test file to reuse.
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`DB warm-up attempt ${i}/${attempts} failed: ${message}`);
      if (i === attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};