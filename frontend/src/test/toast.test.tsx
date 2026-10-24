import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ToastContainer from '../components/common/ToastContainer';
import { useUiStore } from '../store/uiStore';

describe('ToastContainer', () => {
  beforeEach(() => {
    useUiStore.setState({ toasts: [] } as never);
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the toast message', () => {
    act(() => {
      useUiStore.getState().pushToast('Hello world', 'success');
    });
    render(<ToastContainer />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('dismisses the toast when the × button is clicked', () => {
    act(() => {
      useUiStore.getState().pushToast('Dismissable', 'info');
    });
    render(<ToastContainer />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }));
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('renders at the top (top-20) matching the mockup placement', () => {
    act(() => {
      useUiStore.getState().pushToast('Top toast', 'success');
    });
    const { container } = render(<ToastContainer />);
    // The outermost wrapper carries the fixed top-20 class.
    const wrapper = container.querySelector('.fixed.top-20');
    expect(wrapper).not.toBeNull();
  });
});