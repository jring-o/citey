import { describe, it, expect } from 'vitest';
import { validate } from '../validate';
import { initialCodemetaFormState } from '../state';
import type { CodemetaFormState } from '../state';

/** Minimal valid form state. */
function validState(): CodemetaFormState {
  return {
    ...initialCodemetaFormState(),
    name: 'My Software',
    url: 'https://example.com',
    authors: [
      {
        family: 'Doe',
        given: 'Jane',
        email: '',
        affiliation: '',
        orcid: '',
      },
    ],
  };
}

describe('validate', () => {
  it('returns ok for valid full input', () => {
    const result = validate(validState());
    expect(result.ok).toBe(true);
  });

  it('returns an error for missing name', () => {
    const state = { ...validState(), name: '' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const nameError = result.errors.find((e) => e.field === 'name');
      expect(nameError).toBeDefined();
      expect(nameError!.message).toContain('required');
    }
  });

  it('returns an error for dateCreated of "not-a-date"', () => {
    const state = { ...validState(), dateCreated: 'not-a-date' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateCreated');
      expect(dateError).toBeDefined();
      expect(dateError!.message).toContain('not-a-date');
      expect(dateError!.message).toContain('not a valid date');
    }
  });

  it('returns an error for invalid dateCreated (2025-13-40)', () => {
    const state = { ...validState(), dateCreated: '2025-13-40' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateCreated');
      expect(dateError).toBeDefined();
    }
  });

  it('returns an error for dateCreated of "2025-02-30" (February 30th)', () => {
    const state = { ...validState(), dateCreated: '2025-02-30' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateCreated');
      expect(dateError).toBeDefined();
    }
  });

  it('accepts a valid dateCreated', () => {
    const state = { ...validState(), dateCreated: '2025-06-15' };
    const result = validate(state);
    // No dateCreated errors
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateCreated');
      expect(dateError).toBeUndefined();
    }
  });

  it('returns an error for invalid dateModified', () => {
    const state = { ...validState(), dateModified: 'not-a-date' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateModified');
      expect(dateError).toBeDefined();
      expect(dateError!.message).toContain('not a valid date');
    }
  });

  it('returns an error for invalid SPDX license', () => {
    const state = { ...validState(), license: 'NOT-A-LICENSE' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const licenseError = result.errors.find((e) => e.field === 'license');
      expect(licenseError).toBeDefined();
      expect(licenseError!.message).toContain('SPDX');
    }
  });

  it('accepts an empty license (optional)', () => {
    const state = { ...validState(), license: '' };
    const result = validate(state);
    // No license errors
    if (!result.ok) {
      const licenseError = result.errors.find((e) => e.field === 'license');
      expect(licenseError).toBeUndefined();
    }
  });

  it('accepts a valid SPDX license', () => {
    const state = { ...validState(), license: 'MIT' };
    const result = validate(state);
    if (!result.ok) {
      const licenseError = result.errors.find((e) => e.field === 'license');
      expect(licenseError).toBeUndefined();
    }
  });

  it('returns an error for invalid URL', () => {
    const state = { ...validState(), url: 'not-a-url' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const urlError = result.errors.find((e) => e.field === 'url');
      expect(urlError).toBeDefined();
    }
  });

  it('returns an error when authors have no family name', () => {
    const state = {
      ...validState(),
      authors: [{ family: '', given: '', email: '', affiliation: '', orcid: '' }],
    };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const authorError = result.errors.find((e) => e.field === 'authors');
      expect(authorError).toBeDefined();
    }
  });

  it('passes validation for a full valid input with all fields', () => {
    const state: CodemetaFormState = {
      ...validState(),
      description: 'A test tool',
      version: '1.0.0',
      dateCreated: '2025-01-01',
      dateModified: '2025-06-01',
      license: 'Apache-2.0',
      codeRepository: 'https://github.com/user/repo',
      identifier: 'https://doi.org/10.5281/zenodo.1234567',
      programmingLanguage: 'Python',
      keywords: 'test, software',
      applicationCategory: 'Scientific',
      operatingSystem: 'Linux',
      softwareRequirements: 'Python >= 3.8',
      funding: 'NSF',
      fundingReferences: [],
      developmentStatus: 'active',
      referencePublication: 'https://doi.org/10.1234/test',
      advancedOpen: true,
    };
    const result = validate(state);
    expect(result.ok).toBe(true);
  });

  // ---- Code repository URL validation ----

  it('returns an error for invalid codeRepository URL', () => {
    const state = { ...validState(), codeRepository: 'not-a-url' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const repoError = result.errors.find((e) => e.field === 'codeRepository');
      expect(repoError).toBeDefined();
      expect(repoError!.message).toContain('not valid');
    }
  });

  it('accepts a valid codeRepository URL', () => {
    const state = { ...validState(), codeRepository: 'https://github.com/user/repo' };
    const result = validate(state);
    if (!result.ok) {
      const repoError = result.errors.find((e) => e.field === 'codeRepository');
      expect(repoError).toBeUndefined();
    }
  });

  // ---- Identifier URL validation ----

  it('returns an error for invalid identifier URL', () => {
    const state = { ...validState(), identifier: 'not-a-url' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const idError = result.errors.find((e) => e.field === 'identifier');
      expect(idError).toBeDefined();
      expect(idError!.message).toContain('valid URL');
    }
  });

  it('accepts a valid identifier URL', () => {
    const state = { ...validState(), identifier: 'https://doi.org/10.5281/zenodo.1234567' };
    const result = validate(state);
    if (!result.ok) {
      const idError = result.errors.find((e) => e.field === 'identifier');
      expect(idError).toBeUndefined();
    }
  });

  it('accepts an empty identifier (optional)', () => {
    const state = { ...validState(), identifier: '' };
    const result = validate(state);
    if (!result.ok) {
      const idError = result.errors.find((e) => e.field === 'identifier');
      expect(idError).toBeUndefined();
    }
  });

  // ---- ORCID validation ----

  it('returns an error for invalid ORCID format', () => {
    const state = {
      ...validState(),
      authors: [{ family: 'Doe', given: 'Jane', email: '', affiliation: '', orcid: '1234' }],
    };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const orcidError = result.errors.find((e) => e.field === 'authors[0].orcid');
      expect(orcidError).toBeDefined();
      expect(orcidError!.message).toContain('0000-0000-0000-000X');
    }
  });

  it('returns an error for ORCID with bad checksum', () => {
    const state = {
      ...validState(),
      authors: [
        { family: 'Doe', given: 'Jane', email: '', affiliation: '', orcid: '0000-0002-1825-0090' },
      ],
    };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const orcidError = result.errors.find((e) => e.field === 'authors[0].orcid');
      expect(orcidError).toBeDefined();
      expect(orcidError!.message).toContain('checksum');
    }
  });

  it('accepts a valid ORCID', () => {
    const state = {
      ...validState(),
      authors: [
        { family: 'Doe', given: 'Jane', email: '', affiliation: '', orcid: '0000-0002-1825-0097' },
      ],
    };
    const result = validate(state);
    expect(result.ok).toBe(true);
  });

  // ---- Email validation ----

  it('returns an error for invalid email format', () => {
    const state = {
      ...validState(),
      authors: [
        { family: 'Doe', given: 'Jane', email: 'not-an-email', affiliation: '', orcid: '' },
      ],
    };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const emailError = result.errors.find((e) => e.field === 'authors[0].email');
      expect(emailError).toBeDefined();
      expect(emailError!.message).toContain('Email');
    }
  });

  it('accepts a valid email', () => {
    const state = {
      ...validState(),
      authors: [
        { family: 'Doe', given: 'Jane', email: 'jane@example.com', affiliation: '', orcid: '' },
      ],
    };
    const result = validate(state);
    expect(result.ok).toBe(true);
  });

  it('accepts an empty email (optional)', () => {
    const state = {
      ...validState(),
      authors: [{ family: 'Doe', given: 'Jane', email: '', affiliation: '', orcid: '' }],
    };
    const result = validate(state);
    expect(result.ok).toBe(true);
  });

  // ---- Empty authors array ----

  it('returns an error for empty authors array', () => {
    const state = { ...validState(), authors: [] };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const authorError = result.errors.find((e) => e.field === 'authors');
      expect(authorError).toBeDefined();
      expect(authorError!.message).toContain('required');
    }
  });

  // ---- Author with given but no family name ----

  it('returns an error when author has given name but no family name', () => {
    const state = {
      ...validState(),
      authors: [{ family: '', given: 'Jane', email: '', affiliation: '', orcid: '' }],
    };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const familyError = result.errors.find((e) => e.field === 'authors[0].family');
      expect(familyError).toBeDefined();
      expect(familyError!.message).toContain('Family name');
    }
  });

  // ---- Author missing given name ----

  it('returns an error when author has family name but no given name', () => {
    const state = {
      ...validState(),
      authors: [{ family: 'Doe', given: '', email: '', affiliation: '', orcid: '' }],
    };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const givenError = result.errors.find((e) => e.field === 'authors[0].given');
      expect(givenError).toBeDefined();
      expect(givenError!.message).toContain('Given name');
    }
  });

  // ---- Whitespace-only name ----

  it('returns an error for whitespace-only name', () => {
    const state = { ...validState(), name: '   ' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const nameError = result.errors.find((e) => e.field === 'name');
      expect(nameError).toBeDefined();
    }
  });
});
