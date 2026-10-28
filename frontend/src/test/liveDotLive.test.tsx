import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { publicService } from '../services/publicService';
import LiveDot from '../components/landing/LiveDot';

/**
 * Covers the polling behaviour: on success the real count shows; on
 * failure (rejected fetch, or success without `active_users`) the widget
 * hides instead of showing a plausible-looking fabricated number.
 */
describe('LiveDot - live count', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

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

  it('hides the widget when the endpoint omits active_users', async () => {
    vi.spyOn(publicService, 'getStats').mockResolvedValue({
      status: 'ok',
      uptime_seconds: 1,
      version: 'test',
    });
    const { container } = render(<LiveDot />);
    await waitFor(() => {
      expect(container.textContent).toBe('');
    });
  });

  it('hides the widget when the endpoint rejects', async () => {
    vi.spyOn(publicService, 'getStats').mockRejectedValue(new Error('down'));
    const { container } = render(<LiveDot />);
    await waitFor(() => {
      expect(container.textContent).toBe('');
    });
  });

  it('honours the count prop over polling', async () => {
    const spy = vi.spyOn(publicService, 'getStats');
    render(<LiveDot count={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});