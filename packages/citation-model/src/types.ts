/** Coarse package-source taxonomy. */
export type Ecosystem = 'pypi' | 'cran' | 'npm' | 'julia' | 'generic';

/** Version policy for a package. */
export type VersionPolicy = 'latest' | 'preferred-version' | 'unversioned';

/** Author kind discriminator. */
export type AuthorKind = 'person' | 'organization';

/** A single author of a citable software package. */
export type Author = {
  family: string;
  given: string;
  orcid?: string | undefined;
  affiliation?: string | undefined;
  kind: AuthorKind;
};

/**
 * The canonical software-citation block.
 *
 * Citey enforces a single, opinionated model for software citations
 * following the FORCE11 Software Citation Principles: cite the software
 * itself, not a proxy paper. There is no `entryType`; every citation is a
 * software citation.
 *
 * Constraint: at least one of `doi` or `url` MUST be present (the
 * citation needs a resolvable pointer to the work).
 */
export type SoftwareCitation = {
  title: string;
  authors: Author[];
  year: string;
  version?: string | undefined;
  doi?: string | undefined;
  url?: string | undefined;
  publisher?: string | undefined;
};

/** Provenance metadata for a package record. */
export type Provenance = {
  source: 'hand-curated' | 'imported';
  curator: string;
  dateAdded: string;
  lastReviewed: string;
  sourceUrl?: string | undefined;
};

/**
 * The canonical citable-software package record.
 *
 * Two shapes exist:
 *
 *  - **Primary** (no `citeAs`): a self-contained citation. `homepage`
 *    and `citation` are required.
 *  - **Alias / sub-module** (`citeAs` set): this package doesn't carry its
 *    own citation — it redirects to another package at match time. Typical
 *    example: `astropy.cosmology` → `astropy`. For alias entries, the
 *    schema makes `homepage` and `citation` optional and forbids `dois`
 *    and `preferredVersion` (those live on the parent). The match engine
 *    follows `citeAs` and returns the parent's citation with a
 *    `matchedVia` breadcrumb on the hit.
 */
export type Package = {
  id: string;
  canonicalName: string;
  aliases: string[];
  ecosystem: Ecosystem;
  description: string;
  homepage?: string | undefined;
  repository?: string | undefined;
  license?: string | undefined;
  dois?: string[] | undefined;
  citation?: SoftwareCitation | undefined;
  tags?: string[] | undefined;
  provenance: Provenance;
  versionPolicy: VersionPolicy;
  preferredVersion?: string | undefined;
  notes?: string | undefined;
  /**
   * If set, this package's citation resolves to the target package's
   * citation at match time. Must reference an existing package id that
   * does not itself have `citeAs` (single-level redirects only).
   */
  citeAs?: string | undefined;
};

/** A single package match returned by the extension's match engine. */
export type PackageHit = {
  package: Package;
  confidence: 'high' | 'low';
  matchedAliases: string[];
  fuseScore?: number | undefined;
  /**
   * Present when the hit was resolved through a `citeAs` redirect. Each
   * entry is the `canonicalName` of an alias/sub-module package that
   * forwarded to this citation. Example: a hit on Astropy triggered by
   * "astropy.cosmology" carries `matchedVia: ["astropy.cosmology"]`.
   */
  matchedVia?: string[] | undefined;
};

/** Result of the extension's package-matching process. */
export type MatchResult =
  | { kind: 'hits'; high: PackageHit[]; low: PackageHit[] }
  | { kind: 'fallback'; source: 'citeas'; hits: PackageHit[] }
  | { kind: 'miss'; reason: 'no-local' | 'fallback-disabled' | 'fallback-failed' };
