import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsWebhooks from '../pages/app/settings/SettingsWebhooks';
import type { WebhookEndpoint, WebhookDelivery } from '../services/webhookService';

/**
 * vi.mock factories are hoisted above the imports, so any value they
 * reference must be hoisted too — vi.hoisted() puts this block above the
 * vi.mock calls at runtime. Paths are relative to THIS file (src/test/),
 * which is one level shallower than the component under test.
 */
const {
  mockEndpoints,
  mockDeliveries,
  mockCreateMutate,
  mockUpdateMutate,
  mockDeleteMutate,
  mockRetryMutate,
  mockPushToast,
} = vi.hoisted(() => {
  const endpoints: WebhookEndpoint[] = [
    {
      id: 'ep-1',
      url: 'https://example.com/hook',
      description: 'Prod webhook',
      events: ['task.created', 'task.updated'],
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ep-2',
      url: 'https://staging.example.com/hook',
      description: null,
      events: ['task.deleted'],
      is_active: false,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ];
  const deliveries: WebhookDelivery[] = [
    {
      id: 'd-1',
      event_type: 'task.created',
      status: 'success',
      attempt_count: 1,
      next_attempt_at: '2026-01-01T00:00:00Z',
      last_attempt_at: '2026-01-01T00:00:00Z',
      last_response_status: 200,
      last_response_body: 'ok',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'd-2',
      event_type: 'task.updated',
      status: 'dead',
      attempt_count: 6,
      next_attempt_at: '2026-01-01T00:00:00Z',
      last_attempt_at: '2026-01-01T00:00:00Z',
      last_response_status: 500,
      last_response_body: 'fail',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];
  return {
    mockEndpoints: endpoints,
    mockDeliveries: deliveries,
    mockCreateMutate: vi.fn(),
    mockUpdateMutate: vi.fn(),
    mockDeleteMutate: vi.fn(),
    mockRetryMutate: vi.fn(),
    mockPushToast: vi.fn(),
  };
});

vi.mock('../hooks/useWebhooks', () => ({
  useWebhookEndpoints: () => ({ data: mockEndpoints, isLoading: false }),
  useCreateWebhookEndpoint: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateWebhookEndpoint: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useDeleteWebhookEndpoint: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useWebhookDeliveries: () => ({ data: mockDeliveries, isLoading: false }),
  useRetryWebhookDelivery: () => ({ mutate: mockRetryMutate, isPending: false }),
}));

vi.mock('../store/uiStore', () => ({
  useUiStore: (selector: (s: { pushToast: typeof mockPushToast }) => unknown) =>
    selector({ pushToast: mockPushToast }),
}));

describe('WebhooksModal', () => {
  beforeEach(() => {
    mockCreateMutate.mockReset();
    mockUpdateMutate.mockReset();
    mockDeleteMutate.mockReset();
    mockRetryMutate.mockReset();
    mockPushToast.mockReset();
  });

  it('renders the title and both endpoints', () => {
    render(<SettingsWebhooks />);
    expect(screen.getByRole('heading', { name: /webhooks/i })).toBeInTheDocument();
    expect(screen.getByText('https://example.com/hook')).toBeInTheDocument();
    expect(screen.getByText('https://staging.example.com/hook')).toBeInTheDocument();
  });

  it('rejects a non-https URL before calling the mutation', () => {
    render(<SettingsWebhooks />);
    fireEvent.change(screen.getByPlaceholderText(/example\.com\/hooks\/tudu/i), {
      target: { value: 'http://insecure.local/hook' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create endpoint/i }));
    expect(mockCreateMutate).not.toHaveBeenCalled();
    expect(mockPushToast).toHaveBeenCalledWith(expect.stringMatching(/https/i), 'error');
  });

  it('rejects a create with no events selected', () => {
    render(<SettingsWebhooks />);
    fireEvent.change(screen.getByPlaceholderText(/example\.com\/hooks\/tudu/i), {
      target: { value: 'https://example.com/hook' },
    });
    // The modal starts with all four events checked; clicking unchecks each.
    screen.getAllByRole('checkbox').forEach((cb) => {
      fireEvent.click(cb);
    });
    fireEvent.click(screen.getByRole('button', { name: /create endpoint/i }));
    expect(mockCreateMutate).not.toHaveBeenCalled();
    expect(mockPushToast).toHaveBeenCalledWith(expect.stringMatching(/event/i), 'error');
  });

  it('pauses an active endpoint', () => {
    render(<SettingsWebhooks />);
    const pauseButtons = screen.getAllByRole('button', { name: /^pause$/i });
    expect(pauseButtons).toHaveLength(1);
    fireEvent.click(pauseButtons[0]);
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'ep-1',
      is_active: false,
    });
  });

  it('resumes a paused endpoint', () => {
    render(<SettingsWebhooks />);
    const resumeButtons = screen.getAllByRole('button', { name: /^resume$/i });
    expect(resumeButtons).toHaveLength(1);
    fireEvent.click(resumeButtons[0]);
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'ep-2',
      is_active: true,
    });
  });

  it('shows delivery history when expanded', () => {
    render(<SettingsWebhooks />);
    fireEvent.click(screen.getAllByRole('button', { name: /deliveries/i })[0]);
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('dead')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('offers a retry for dead deliveries only', () => {
    render(<SettingsWebhooks />);
    fireEvent.click(screen.getAllByRole('button', { name: /deliveries/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockRetryMutate).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: 'd-2' }),
      expect.any(Object),
    );
  });
});