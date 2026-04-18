import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CitationCard } from '../components/CitationCard.js';
import type { Package } from '@citey/citation-model';

function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: 'test-pkg-1',
    canonicalName: 'NumPy',
    aliases: ['numpy'],
    ecosystem: 'pypi',
    description: 'Fundamental package for scientific computing with Python',
    homepage: 'https://numpy.org',
    dois: ['10.1038/s41586-020-2649-2'],
    citation: {
      title: 'NumPy',
      authors: [
        { family: 'Harris', given: 'Charles R.', kind: 'person' },
        { family: 'Millman', given: 'K. Jarrod', kind: 'person' },
        { family: 'van der Walt', given: 'Stefan J.', kind: 'person' },
        { family: 'Gommers', given: 'Ralf', kind: 'person' },
        { family: 'Virtanen', given: 'Pauli', kind: 'person' },
      ],
      year: '2020',
      doi: '10.1038/s41586-020-2649-2',
    },
    provenance: {
      source: 'hand-curated',
      curator: 'test',
      dateAdded: '2024-01-01',
      lastReviewed: '2024-01-01',
    },
    versionPolicy: 'latest',
    ...overrides,
  };
}

describe('CitationCard', () => {
  it('renders the canonical name as a title', () => {
    render(<CitationCard pkg={makePackage()} confidence="high" />);
    expect(screen.getByText('NumPy')).toBeDefined();
  });

  it('renders the description', () => {
    render(<CitationCard pkg={makePackage()} confidence="high" />);
    expect(
      screen.getByText(
        'Fundamental package for scientific computing with Python',
      ),
    ).toBeDefined();
  });

  it('renders the first 3 authors with "et al." when there are more', () => {
    render(<CitationCard pkg={makePackage()} confidence="high" />);
    const byline = screen.getByText(
      /Charles R\. Harris, K\. Jarrod Millman, Stefan J\. van der Walt et al\./,
    );
    expect(byline).toBeDefined();
  });

  it('renders all authors without "et al." when there are 3 or fewer', () => {
    const pkg = makePackage({
      citation: {
        title: 'NumPy',
        authors: [
          { family: 'Harris', given: 'Charles R.', kind: 'person' },
          { family: 'Millman', given: 'K. Jarrod', kind: 'person' },
        ],
        year: '2020',
        doi: '10.1038/s41586-020-2649-2',
      },
    });
    render(<CitationCard pkg={pkg} confidence="high" />);
    const byline = screen.getByText('Charles R. Harris, K. Jarrod Millman');
    expect(byline).toBeDefined();
    expect(byline.textContent).not.toContain('et al.');
  });

  it('renders a DOI link that opens in a new tab with noopener', () => {
    render(<CitationCard pkg={makePackage()} confidence="high" />);
    const doiLink = screen.getByRole('link');
    expect(doiLink.getAttribute('href')).toBe(
      'https://doi.org/10.1038/s41586-020-2649-2',
    );
    expect(doiLink.getAttribute('target')).toBe('_blank');
    expect(doiLink.getAttribute('rel')).toContain('noopener');
  });

  it('does not render a DOI badge when no DOI', () => {
    const pkg = makePackage({
      dois: [],
      citation: {
        title: 'NumPy',
        authors: [{ family: 'Harris', given: 'Charles R.', kind: 'person' }],
        year: '2020',
        url: 'https://numpy.org',
      },
    });
    render(<CitationCard pkg={pkg} confidence="low" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('calls onCopy when the copy button is clicked', () => {
    const onCopy = vi.fn();
    render(
      <CitationCard pkg={makePackage()} confidence="high" onCopy={onCopy} />,
    );
    const copyBtn = screen.getByRole('button', {
      name: 'Copy this citation',
    });
    copyBtn.click();
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('renders a confidence chip', () => {
    render(<CitationCard pkg={makePackage()} confidence="high" />);
    expect(screen.getByText('High')).toBeDefined();
  });
});
