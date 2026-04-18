import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  emptyAuthor,
  emptyFundingReference,
  initialCodemetaFormState,
  useCodemetaForm,
} from '../state';

describe('emptyAuthor', () => {
  it('returns an author with all empty strings', () => {
    const a = emptyAuthor();
    expect(a.family).toBe('');
    expect(a.given).toBe('');
    expect(a.email).toBe('');
    expect(a.affiliation).toBe('');
    expect(a.orcid).toBe('');
  });
});

describe('emptyFundingReference', () => {
  it('returns a funding reference with all empty strings', () => {
    const ref = emptyFundingReference();
    expect(ref.funderName).toBe('');
    expect(ref.awardNumber).toBe('');
    expect(ref.awardTitle).toBe('');
  });
});

describe('initialCodemetaFormState', () => {
  it('returns the expected default values', () => {
    const s = initialCodemetaFormState();
    expect(s.name).toBe('');
    expect(s.description).toBe('');
    expect(s.authors).toHaveLength(1);
    expect(s.authors[0]).toEqual(emptyAuthor());
    expect(s.fundingReferences).toEqual([]);
    expect(s.advancedOpen).toBe(false);
  });
});

describe('useCodemetaForm', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useCodemetaForm());
    expect(result.current.state.name).toBe('');
    expect(result.current.state.advancedOpen).toBe(false);
    expect(result.current.state.authors).toHaveLength(1);
  });

  it('setField updates a string field', () => {
    const { result } = renderHook(() => useCodemetaForm());
    act(() => {
      result.current.setField('name', 'Test');
    });
    expect(result.current.state.name).toBe('Test');
  });

  it('toggleAdvanced flips advancedOpen', () => {
    const { result } = renderHook(() => useCodemetaForm());
    expect(result.current.state.advancedOpen).toBe(false);
    act(() => {
      result.current.toggleAdvanced();
    });
    expect(result.current.state.advancedOpen).toBe(true);
    act(() => {
      result.current.toggleAdvanced();
    });
    expect(result.current.state.advancedOpen).toBe(false);
  });

  it('addAuthor appends a new empty author', () => {
    const { result } = renderHook(() => useCodemetaForm());
    expect(result.current.state.authors).toHaveLength(1);
    act(() => {
      result.current.addAuthor();
    });
    expect(result.current.state.authors).toHaveLength(2);
    expect(result.current.state.authors[1]).toEqual(emptyAuthor());
  });

  it('setAuthor updates a specific author by index', () => {
    const { result } = renderHook(() => useCodemetaForm());
    act(() => {
      result.current.setAuthor(0, {
        family: 'Doe',
        given: 'Jane',
        email: 'jane@example.com',
        affiliation: 'MIT',
        orcid: '',
      });
    });
    expect(result.current.state.authors[0]!.family).toBe('Doe');
    expect(result.current.state.authors[0]!.email).toBe('jane@example.com');
  });

  it('removeAuthor removes an author by index', () => {
    const { result } = renderHook(() => useCodemetaForm());
    act(() => {
      result.current.addAuthor();
    });
    expect(result.current.state.authors).toHaveLength(2);
    act(() => {
      result.current.setAuthor(1, {
        family: 'Smith',
        given: 'John',
        email: '',
        affiliation: '',
        orcid: '',
      });
    });
    act(() => {
      result.current.removeAuthor(0);
    });
    expect(result.current.state.authors).toHaveLength(1);
    expect(result.current.state.authors[0]!.family).toBe('Smith');
  });

  it('addFundingReference appends a new empty funding reference', () => {
    const { result } = renderHook(() => useCodemetaForm());
    expect(result.current.state.fundingReferences).toHaveLength(0);
    act(() => {
      result.current.addFundingReference();
    });
    expect(result.current.state.fundingReferences).toHaveLength(1);
    expect(result.current.state.fundingReferences[0]).toEqual(emptyFundingReference());
  });

  it('setFundingReference updates a specific funding reference by index', () => {
    const { result } = renderHook(() => useCodemetaForm());
    act(() => {
      result.current.addFundingReference();
    });
    act(() => {
      result.current.setFundingReference(0, {
        funderName: 'NSF',
        awardNumber: '12345',
        awardTitle: 'Grant',
      });
    });
    expect(result.current.state.fundingReferences[0]!.funderName).toBe('NSF');
    expect(result.current.state.fundingReferences[0]!.awardNumber).toBe('12345');
  });

  it('removeFundingReference removes a funding reference by index', () => {
    const { result } = renderHook(() => useCodemetaForm());
    act(() => {
      result.current.addFundingReference();
      result.current.addFundingReference();
    });
    act(() => {
      result.current.setFundingReference(1, {
        funderName: 'DFG',
        awardNumber: '999',
        awardTitle: '',
      });
    });
    act(() => {
      result.current.removeFundingReference(0);
    });
    expect(result.current.state.fundingReferences).toHaveLength(1);
    expect(result.current.state.fundingReferences[0]!.funderName).toBe('DFG');
  });
});
