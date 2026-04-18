import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DidWeMiss } from '../DidWeMiss';

// ---------------------------------------------------------------------------
// §5.1.7 — Did-we-miss link tests
// ---------------------------------------------------------------------------

describe('DidWeMiss', () => {
  it('links to the hub landing page', () => {
    render(<DidWeMiss />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://citey.scios.tech');
  });

  it('renders simple link in default mode', () => {
    render(<DidWeMiss />);
    expect(screen.getByText('Did we miss something?')).toBeDefined();
  });

  it('renders full CTA with "Help us add it" in full mode', () => {
    render(<DidWeMiss full />);
    const cta = screen.getByRole('link');
    expect(cta.textContent).toContain('Help us add it');
  });

  it('opens link in a new tab', () => {
    render(<DidWeMiss />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
