'use client';

import { useCallback, useState } from 'react';

export type Ecosystem = 'pypi' | 'cran' | 'npm' | 'julia' | 'generic';

export interface SeedAuthor {
  family: string;
  given: string;
  kind: 'person' | 'organization';
  orcid: string;
  affiliation: string;
}

export function emptyAuthor(): SeedAuthor {
  return {
    family: '',
    given: '',
    kind: 'person',
    orcid: '',
    affiliation: '',
  };
}

export interface SeedFormState {
  // Identity
  id: string;
  canonicalName: string;
  ecosystem: Ecosystem;
  description: string;

  // URLs
  homepage: string;
  repository: string;
  license: string;

  // Citation (always software-only, FORCE11)
  authors: SeedAuthor[];
  year: string;
  version: string;
  doi: string;
  citationUrl: string;
  publisher: string;

  // Attribution
  contributorName: string;

  // Software Heritage integration. When `archiveInSwh` is true, the modal
  // fires Save Code Now and writes `swhPending` + `swhSubmittedAt` into
  // the seed YAML. The backfill cron later writes the SWHID.
  archiveInSwh: boolean;
}

export function initialSeedFormState(): SeedFormState {
  return {
    id: '',
    canonicalName: '',
    ecosystem: 'pypi',
    description: '',
    homepage: '',
    repository: '',
    license: '',
    authors: [emptyAuthor()],
    year: String(new Date().getFullYear()),
    version: '',
    doi: '',
    citationUrl: '',
    publisher: '',
    contributorName: '',
    archiveInSwh: true,
  };
}

export function useSeedForm() {
  const [state, setState] = useState<SeedFormState>(initialSeedFormState);

  const setField = useCallback(<K extends keyof SeedFormState>(key: K, value: SeedFormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAuthor = useCallback((index: number, author: SeedAuthor) => {
    setState((prev) => {
      const authors = [...prev.authors];
      authors[index] = author;
      return { ...prev, authors };
    });
  }, []);

  const addAuthor = useCallback(() => {
    setState((prev) => ({ ...prev, authors: [...prev.authors, emptyAuthor()] }));
  }, []);

  const removeAuthor = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialSeedFormState());
  }, []);

  const applyState = useCallback((next: SeedFormState) => {
    setState(next);
  }, []);

  return {
    state,
    setField,
    setAuthor,
    addAuthor,
    removeAuthor,
    reset,
    applyState,
  };
}
