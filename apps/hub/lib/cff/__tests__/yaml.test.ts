import { describe, it, expect } from 'vitest';
import { toCffYaml } from '../yaml';
import { initialCffFormState } from '../state';
import type { CffFormState } from '../state';

/** Minimal valid form state for testing. */
function minimalValid(): CffFormState {
  return {
    ...initialCffFormState(),
    title: 'My Software',
    message: 'If you use this software, please cite it using the metadata from this file.',
    authors: [
      {
        family: 'Doe',
        given: 'Jane',
        orcid: '',
        affiliation: '',
        kind: 'person',
      },
    ],
    url: 'https://example.com',
  };
}

describe('toCffYaml', () => {
  it('begins with cff-version: 1.2.0', () => {
    const yaml = toCffYaml(minimalValid());
    expect(yaml.startsWith('cff-version: 1.2.0\n')).toBe(true);
  });

  it('contains required CFF fields', () => {
    const yaml = toCffYaml(minimalValid());
    expect(yaml).toContain('cff-version: 1.2.0');
    expect(yaml).toContain('message:');
    expect(yaml).toContain('title:');
    expect(yaml).toContain('authors:');
  });

  it('contains the authors block with family-names and given-names', () => {
    const yaml = toCffYaml(minimalValid());
    expect(yaml).toContain('family-names: Doe');
    expect(yaml).toContain('given-names: Jane');
  });

  it('uses LF line endings only (no CRLF)', () => {
    const yaml = toCffYaml(minimalValid());
    expect(yaml).not.toContain('\r\n');
    expect(yaml).not.toContain('\r');
  });

  it('omits empty optional fields', () => {
    const yaml = toCffYaml(minimalValid());
    expect(yaml).not.toContain('date-released:');
    expect(yaml).not.toContain('doi:');
    expect(yaml).not.toContain('license:');
    expect(yaml).not.toContain('repository-code:');
    expect(yaml).not.toContain('keywords:');
  });

  it('includes optional fields when provided', () => {
    const state = {
      ...minimalValid(),
      version: '2.0.0',
      dateReleased: '2025-06-15',
      doi: '10.5281/zenodo.1234567',
      license: 'MIT',
      repositoryCode: 'https://github.com/user/repo',
      keywords: 'citation, software',
    };
    const yaml = toCffYaml(state);
    expect(yaml).toContain('version: 2.0.0');
    expect(yaml).toContain('date-released: 2025-06-15');
    expect(yaml).toContain('doi: 10.5281/zenodo.1234567');
    expect(yaml).toContain('license: MIT');
    expect(yaml).toContain('repository-code: https://github.com/user/repo');
    expect(yaml).toContain('keywords:');
    expect(yaml).toContain('- citation');
    expect(yaml).toContain('- software');
  });

  it('produces valid YAML for a full state including advanced fields', () => {
    const state: CffFormState = {
      ...minimalValid(),
      abstract: 'A tool for citations',
      type: 'dataset',
      identifiers: [
        { type: 'doi', value: '10.5281/zenodo.9999999', description: 'Concept DOI' },
      ],
      preferredCitation: {
        type: 'article',
        title: 'A Great Paper',
        authors: [{ family: 'Smith', given: 'John', orcid: '', affiliation: '', kind: 'person' }],
        doi: '10.1234/test',
        journal: 'JOSS',
        volume: '5',
        issue: '42',
        year: '2025',
        start: '1',
        end: '10',
        url: 'https://doi.org/10.1234/test',
      },
      advancedOpen: true,
    };
    const yaml = toCffYaml(state);
    expect(yaml).toContain('type: dataset');
    expect(yaml).toContain('abstract:');
    expect(yaml).toContain('identifiers:');
    expect(yaml).toContain('preferred-citation:');
  });
});
