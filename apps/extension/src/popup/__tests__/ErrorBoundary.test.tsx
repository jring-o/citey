import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// ---------------------------------------------------------------------------
// Chrome API stubs
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();

  vi.stubGlobal('chrome', {
    runtime: {
      getManifest: () => ({ version: '0.1.0' }),
      openOptionsPage: vi.fn(),
    },
  });

  // Suppress console.error from React + ErrorBoundary during tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// Helper: a component that throws on render
// ---------------------------------------------------------------------------

function ThrowingChild({ message }: { message: string }) {
  throw new Error(message);
}

function GoodChild() {
  return <p>All good</p>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeDefined();
  });

  it('renders error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="render crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Something went wrong/)).toBeDefined();
  });

  it('renders a Retry button in the error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="render crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('renders a Did-we-miss link in the error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="render crash" />
      </ErrorBoundary>,
    );

    const link = screen.getByText('Did we miss something?');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toContain('citey.scios.tech');
  });

  it('has role="alert" on the error container', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="render crash" />
      </ErrorBoundary>,
    );

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeDefined();
  });

  it('recovers from error when Retry is clicked', () => {
    // Use a ref-like approach: first render throws, after retry it doesn't
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) throw new Error('boom');
      return <p>Recovered</p>;
    }

    render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>,
    );

    // Should show error UI
    expect(screen.getByText(/Something went wrong/)).toBeDefined();

    // Fix the child, then click Retry
    shouldThrow = false;
    fireEvent.click(screen.getByText('Retry'));

    // Should now show recovered content
    expect(screen.getByText('Recovered')).toBeDefined();
  });

  it('calls console.error via componentDidCatch', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild message="test crash" />
      </ErrorBoundary>,
    );

    // React and ErrorBoundary both call console.error; check at least one call
    // mentions our boundary's log prefix
    const calls = consoleSpy.mock.calls;
    const hasBoundaryLog = calls.some(
      (args) => typeof args[0] === 'string' && args[0].includes('[Citey] ErrorBoundary'),
    );
    expect(hasBoundaryLog).toBe(true);
  });

  it('handles non-Error thrown values via getDerivedStateFromError', () => {
    function ThrowsString() {
      throw 'string error'; // eslint-disable-line no-throw-literal
    }

    render(
      <ErrorBoundary>
        <ThrowsString />
      </ErrorBoundary>,
    );

    // Should still render error UI
    expect(screen.getByText(/Something went wrong/)).toBeDefined();
  });
});
