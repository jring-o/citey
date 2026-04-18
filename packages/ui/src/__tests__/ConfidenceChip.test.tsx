import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceChip } from '../components/ConfidenceChip.js';

describe('ConfidenceChip', () => {
  it('renders "High" for kind="high"', () => {
    render(<ConfidenceChip kind="high" />);
    const chip = screen.getByText('High');
    expect(chip).toBeDefined();
    expect(chip.textContent).toBe('High');
  });

  it('renders "Low — verify" for kind="low"', () => {
    render(<ConfidenceChip kind="low" />);
    const chip = screen.getByText('Low \u2014 verify');
    expect(chip).toBeDefined();
    expect(chip.textContent).toBe('Low \u2014 verify');
  });

  it('renders "From CiteAs" for kind="citeas"', () => {
    render(<ConfidenceChip kind="citeas" />);
    const chip = screen.getByText('From CiteAs');
    expect(chip).toBeDefined();
    expect(chip.textContent).toBe('From CiteAs');
  });

  it('contains a visible text node — color is not the sole signal', () => {
    const { container } = render(<ConfidenceChip kind="high" />);
    const textContent = container.textContent;
    expect(textContent).not.toBe('');
    expect(textContent?.trim().length).toBeGreaterThan(0);
  });
});
