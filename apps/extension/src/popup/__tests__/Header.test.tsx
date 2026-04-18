import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';

// ---------------------------------------------------------------------------
// Chrome API stubs
// ---------------------------------------------------------------------------

let openOptionsPageMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.restoreAllMocks();

  openOptionsPageMock = vi.fn();
  vi.stubGlobal('chrome', {
    runtime: {
      openOptionsPage: openOptionsPageMock,
    },
  });
});

// ---------------------------------------------------------------------------
// §5.1.2 — Sticky header: logo (left), settings gear (right)
// ---------------------------------------------------------------------------

describe('Header', () => {
  it('renders the Citey logo text', () => {
    render(<Header />);
    expect(screen.getByText('Citey')).toBeDefined();
  });

  it('renders a settings button with aria-label', () => {
    render(<Header />);
    const btn = screen.getByRole('button', { name: 'Open settings' });
    expect(btn).toBeDefined();
  });

  it('calls chrome.runtime.openOptionsPage when settings button is clicked', () => {
    render(<Header />);
    const btn = screen.getByRole('button', { name: 'Open settings' });
    fireEvent.click(btn);
    expect(openOptionsPageMock).toHaveBeenCalledOnce();
  });

  it('renders a gear SVG icon with aria-hidden', () => {
    const { container } = render(<Header />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a header element with correct class', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header.citey-header');
    expect(header).not.toBeNull();
  });
});
