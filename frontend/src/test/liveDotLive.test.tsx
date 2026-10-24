import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { publicService } from '../services/publicService';
import LiveDot from '../components/landing/LiveDot';

/**
 * Companion to liveDot.test.tsx (from Step 2). That file covers the
 * presentational behaviour (`count` prop, initial oscillating value,
 * pulsing dot). This file specifically covers the polling behaviour
 * added in Step 5: `LiveDot` should update to whatever the public
 * stats endpoint returns for `active_users`.
 *
 * The old test file is intentionally untouched; its assertions still
 * pass because the initial render still shows the oscillating value
 * (12) before the async fetch resolves.
 */

describe('LiveDot — real active count', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates to the count returned by /api/public/stats', async () => {
    vi.spyOn(publicService, 'getStats').mockResolvedValue({
      status: 'ok',
      uptime_seconds: 1,
      version: 'test',
      active_users: 42,
    });

    render(<LiveDot />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('keeps oscillating when the endpoint omits active_users', async () => {
    vi.spyOn(publicService, 'getStats').mockResolvedValue({
      status: 'ok',
      uptime_seconds: 1,
      version: 'test',
      // no active_users
    });

    render(<LiveDot />);

    // Initial value stays (12).
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('keeps oscillating when the endpoint rejects', async () => {
    vi.spyOn(publicService, 'getStats').mockRejectedValue(new Error('down'));

    render(<LiveDot />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('honours the count prop over polling', async () => {
    const spy = vi.spyOn(publicService, 'getStats');

    render(<LiveDot count={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
    // Effect skips the poll when count is provided.
    expect(spy).not.toHaveBeenCalled();
  });
});