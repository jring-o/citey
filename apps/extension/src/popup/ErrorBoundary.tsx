// ---------------------------------------------------------------------------
// React error boundary — mandatory at popup root (§5.1.1 state 10)
// ---------------------------------------------------------------------------

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '@citey/ui';
import { DidWeMiss } from './DidWeMiss.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return { hasError: true, errorMessage: message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Citey] ErrorBoundary caught:', error, info);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="citey-error-boundary" role="alert">
          <p className="citey-error-message">
            Something went wrong. Try again, or contribute the missing package.
          </p>
          <Button variant="primary" onClick={this.handleRetry}>
            Retry
          </Button>
          <DidWeMiss />
        </div>
      );
    }
    return this.props.children;
  }
}
