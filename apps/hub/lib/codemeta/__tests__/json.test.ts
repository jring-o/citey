import { describe, it, expect } from 'vitest';
import { toCodemetaJson } from '../json';
import { initialCodemetaFormState } from '../state';
import type { CodemetaFormState } from '../state';

/** Minimal valid form state for testing. */
function minimalValid(): CodemetaFormState {
  return {
    ...initialCodemetaFormState(),
    name: 'My Software',
    authors: [
      {
        family: 'Doe',
        given: 'Jane',
        email: '',
        affiliation: '',
        orcid: '',
      },
    ],
    url: 'https://example.com',
  };
}

describe('toCodemetaJson', () => {
  it('produces JSON with @context set to the codemeta-2.0 URL', () => {
    const json = toCodemetaJson(minimalValid());
    const parsed = JSON.parse(json);
    expect(parsed['@context']).toBe('https://doi.org/10.5063/schema/codemeta-2.0');
  });

  it('produces JSON with @type set to SoftwareSourceCode', () => {
    const json = toCodemetaJson(minimalValid());
    const parsed = JSON.parse(json);
    expect(parsed['@type']).toBe('SoftwareSourceCode');
  });

  it('includes name field from state', () => {
    const json = toCodemetaJson(minimalValid());
    const parsed = JSON.parse(json);
    expect(parsed['name']).toBe('My Software');
  });

  it('includes author array with Person type', () => {
    const json = toCodemetaJson(minimalValid());
    const parsed = JSON.parse(json);
    expect(parsed['author']).toHaveLength(1);
    expect(parsed['author'][0]['@type']).toBe('Person');
    expect(parsed['author'][0]['familyName']).toBe('Doe');
    expect(parsed['author'][0]['givenName']).toBe('Jane');
  });

  it('uses LF line endings only (no CRLF)', () => {
    const json = toCodemetaJson(minimalValid());
    expect(json).not.toContain('\r\n');
    expect(json).not.toContain('\r');
  });

  it('omits empty optional fields', () => {
    const json = toCodemetaJson(minimalValid());
    const parsed = JSON.parse(json);
    expect(parsed['dateCreated']).toBeUndefined();
    expect(parsed['dateModified']).toBeUndefined();
    expect(parsed['license']).toBeUndefined();
    expect(parsed['codeRepository']).toBeUndefined();
    expect(parsed['keywords']).toBeUndefined();
    expect(parsed['programmingLanguage']).toBeUndefined();
  });

  it('includes optional fields when provided', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      version: '2.0.0',
      dateCreated: '2025-06-15',
      dateModified: '2025-07-01',
      license: 'MIT',
      codeRepository: 'https://github.com/user/repo',
      keywords: 'citation, software',
      programmingLanguage: 'Python, R',
      identifier: 'https://doi.org/10.5281/zenodo.1234567',
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['version']).toBe('2.0.0');
    expect(parsed['dateCreated']).toBe('2025-06-15');
    expect(parsed['dateModified']).toBe('2025-07-01');
    expect(parsed['license']).toBe('https://spdx.org/licenses/MIT');
    expect(parsed['codeRepository']).toBe('https://github.com/user/repo');
    expect(parsed['keywords']).toEqual(['citation', 'software']);
    expect(parsed['programmingLanguage']).toEqual(['Python', 'R']);
    expect(parsed['identifier']).toBe('https://doi.org/10.5281/zenodo.1234567');
  });

  it('produces valid JSON that can be parsed', () => {
    const json = toCodemetaJson(minimalValid());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes advanced fields when provided', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      applicationCategory: 'Scientific',
      operatingSystem: 'Linux, macOS',
      softwareRequirements: 'Python >= 3.8',
      developmentStatus: 'active',
      referencePublication: 'https://doi.org/10.1234/test',
      advancedOpen: true,
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['applicationCategory']).toBe('Scientific');
    expect(parsed['operatingSystem']).toEqual(['Linux', 'macOS']);
    expect(parsed['softwareRequirements']).toEqual(['Python >= 3.8']);
    expect(parsed['developmentStatus']).toBe('active');
    expect(parsed['referencePublication']).toBe('https://doi.org/10.1234/test');
  });

  it('formats author ORCID as full URL', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      authors: [
        {
          family: 'Doe',
          given: 'Jane',
          email: 'jane@example.com',
          affiliation: 'University',
          orcid: '0000-0002-1825-0097',
        },
      ],
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['author'][0]['@id']).toBe('https://orcid.org/0000-0002-1825-0097');
    expect(parsed['author'][0]['email']).toBe('jane@example.com');
    expect(parsed['author'][0]['affiliation']).toEqual({
      '@type': 'Organization',
      name: 'University',
    });
  });

  // ---- Funding references ----

  it('includes funding references as Grant objects', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      fundingReferences: [
        { funderName: 'NSF', awardNumber: '12345', awardTitle: 'Research Grant' },
      ],
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['funding']).toHaveLength(1);
    expect(parsed['funding'][0]['@type']).toBe('Grant');
    expect(parsed['funding'][0]['funder']).toEqual({
      '@type': 'Organization',
      name: 'NSF',
    });
    expect(parsed['funding'][0]['identifier']).toBe('12345');
    expect(parsed['funding'][0]['name']).toBe('Research Grant');
  });

  it('funding references overwrite simple funding field', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      funding: 'Simple funding text',
      fundingReferences: [{ funderName: 'DFG', awardNumber: '999', awardTitle: '' }],
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    // Structured references take precedence (overwrite funding key)
    expect(Array.isArray(parsed['funding'])).toBe(true);
    expect(parsed['funding'][0]['@type']).toBe('Grant');
  });

  it('uses simple funding string when no funding references exist', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      funding: 'NSF Grant #12345',
      fundingReferences: [],
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['funding']).toBe('NSF Grant #12345');
  });

  it('filters out funding references with all-blank fields', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      fundingReferences: [{ funderName: '', awardNumber: '', awardTitle: 'only title' }],
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    // Funding ref with no funderName and no awardNumber is filtered out
    expect(parsed['funding']).toBeUndefined();
  });

  // ---- Comma-separated edge cases ----

  it('handles single-item comma-separated fields', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      programmingLanguage: 'Python',
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['programmingLanguage']).toEqual(['Python']);
  });

  it('ignores whitespace-only items in comma-separated fields', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      keywords: 'citation, , , software',
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['keywords']).toEqual(['citation', 'software']);
  });

  it('omits comma-separated field when input is only commas and spaces', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      programmingLanguage: ' , , ',
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['programmingLanguage']).toBeUndefined();
  });

  // ---- Whitespace-only optional fields ----

  it('treats whitespace-only values as empty (omitted)', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      description: '   ',
      version: '  ',
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['description']).toBeUndefined();
    expect(parsed['version']).toBeUndefined();
  });

  // ---- Multiple authors ----

  it('handles multiple authors correctly', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      authors: [
        { family: 'Doe', given: 'Jane', email: '', affiliation: '', orcid: '' },
        { family: 'Smith', given: 'John', email: 'john@test.com', affiliation: '', orcid: '' },
      ],
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['author']).toHaveLength(2);
    expect(parsed['author'][0]['familyName']).toBe('Doe');
    expect(parsed['author'][1]['familyName']).toBe('Smith');
    expect(parsed['author'][1]['email']).toBe('john@test.com');
  });

  // ---- Author with partial fields ----

  it('omits empty author sub-fields from the Person object', () => {
    const state: CodemetaFormState = {
      ...minimalValid(),
      authors: [{ family: 'Doe', given: '', email: '', affiliation: '', orcid: '' }],
    };
    const json = toCodemetaJson(state);
    const parsed = JSON.parse(json);
    expect(parsed['author'][0]['@type']).toBe('Person');
    expect(parsed['author'][0]['familyName']).toBe('Doe');
    expect(parsed['author'][0]['givenName']).toBeUndefined();
    expect(parsed['author'][0]['email']).toBeUndefined();
    expect(parsed['author'][0]['affiliation']).toBeUndefined();
    expect(parsed['author'][0]['@id']).toBeUndefined();
  });
});
