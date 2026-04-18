import { describe, it, expect } from 'vitest';
import { validate } from '../validate';
import { initialCffFormState } from '../state';
import type { CffFormState } from '../state';

/** Minimal valid form state. */
function validState(): CffFormState {
  return {
    ...initialCffFormState(),
    title: 'My Software',
    url: 'https://example.com',
    authors: [
      {
        family: 'Doe',
        given: 'Jane',
        orcid: '',
        affiliation: '',
        kind: 'person',
      },
    ],
  };
}

describe('validate', () => {
  it('returns ok for valid full input', () => {
    const result = validate(validState());
    expect(result.ok).toBe(true);
  });

  it('returns an error for missing title', () => {
    const state = { ...validState(), title: '' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const titleError = result.errors.find((e) => e.field === 'title');
      expect(titleError).toBeDefined();
      expect(titleError!.message).toContain('required');
    }
  });

  it('returns an error pointing at dateReleased for an invalid date', () => {
    const state = { ...validState(), dateReleased: '2025-13-40' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateReleased');
      expect(dateError).toBeDefined();
      expect(dateError!.message).toContain('2025-13-40');
      expect(dateError!.message).toContain('not a valid date');
    }
  });

  it('returns an error for dateReleased of "2025-02-30" (February 30th)', () => {
    const state = { ...validState(), dateReleased: '2025-02-30' };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateReleased');
      expect(dateError).toBeDefined();
    }
  });

  it('accepts a valid date', () => {
    const state = { ...validState(), dateReleased: '2025-06-15' };
    const result = validate(state);
    // No dateReleased errors
    if (!result.ok) {
      const dateError = result.errors.find((e) => e.field === 'dateReleased');
      expect(dateError).toBeUndefined();
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
      authors: [{ family: '', given: '', orcid: '', affiliation: '', kind: 'person' as const }],
    };
    const result = validate(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const authorError = result.errors.find((e) => e.field === 'authors');
      expect(authorError).toBeDefined();
    }
  });
});
