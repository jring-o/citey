import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';
import type { PopupStateName } from '../state-machine';

// ---------------------------------------------------------------------------
// §5.1.2 — Footer: "Did we miss?" link, hidden in empty_selection and restricted_page
// ---------------------------------------------------------------------------

describe('Footer', () => {
  it('renders Did-we-miss link for loading state', () => {
    render(<Footer stateName="loading" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders Did-we-miss link for hits_high state', () => {
    render(<Footer stateName="hits_high" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders Did-we-miss link for hits_mixed state', () => {
    render(<Footer stateName="hits_mixed" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders Did-we-miss link for hits_low state', () => {
    render(<Footer stateName="hits_low" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders Did-we-miss link for fallback_in_flight state', () => {
    render(<Footer stateName="fallback_in_flight" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders Did-we-miss link for citeas_hit state', () => {
    render(<Footer stateName="citeas_hit" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders Did-we-miss link for total_miss state', () => {
    render(<Footer stateName="total_miss" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders Did-we-miss link for error state', () => {
    render(<Footer stateName="error" />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('returns null for empty_selection state (footer hidden)', () => {
    const { container } = render(<Footer stateName="empty_selection" />);
    expect(container.querySelector('footer')).toBeNull();
  });

  it('returns null for restricted_page state (footer hidden)', () => {
    const { container } = render(<Footer stateName="restricted_page" />);
    expect(container.querySelector('footer')).toBeNull();
  });

  it('returns null for oversized_selection state (footer hidden)', () => {
    const { container } = render(<Footer stateName="oversized_selection" />);
    expect(container.querySelector('footer')).toBeNull();
  });

  it('Did-we-miss link points to the hub landing page', () => {
    render(<Footer stateName="loading" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://citey.scios.tech');
  });

  it('renders footer element with correct class', () => {
    const { container } = render(<Footer stateName="loading" />);
    const footer = container.querySelector('footer.citey-footer');
    expect(footer).not.toBeNull();
  });

  // Verify all 11 states are covered: 8 visible + 3 hidden
  it('covers all 11 popup states', () => {
    const allStates: PopupStateName[] = [
      'loading',
      'hits_high',
      'hits_mixed',
      'hits_low',
      'empty_selection',
      'oversized_selection',
      'restricted_page',
      'fallback_in_flight',
      'citeas_hit',
      'total_miss',
      'error',
    ];
    const hiddenStates: PopupStateName[] = [
      'empty_selection',
      'oversized_selection',
      'restricted_page',
    ];
    const visibleStates = allStates.filter((s) => !hiddenStates.includes(s));

    for (const state of visibleStates) {
      const { container } = render(<Footer stateName={state} />);
      expect(container.querySelector('footer')).not.toBeNull();
    }

    for (const state of hiddenStates) {
      const { container } = render(<Footer stateName={state} />);
      expect(container.querySelector('footer')).toBeNull();
    }
  });
});
