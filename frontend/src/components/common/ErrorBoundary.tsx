import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children?: ReactNode }
interface State { hasError: boolean; message: string | null }

/**
 * Top-level error boundary. A thrown render error in any child would
 * otherwise blank the entire app. This renders a recoverable screen
 * and logs the error so it can be diagnosed.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? null };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="card max-w-md p-6 text-center">
          <h1 className="font-handwritten text-3xl text-ink">Something broke</h1>
          <p className="mt-2 text-sm text-ink-muted">
            A part of the app ran into a problem. If you are offline, your cached
            work is safe — reconnect and reload.
          </p>
          {this.state.message && (
            <p className="mt-3 rounded-lg bg-surface-2 p-2 text-left text-xs text-ink-muted">
              <code className="break-words">{this.state.message}</code>
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-accent mt-4 w-full"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
