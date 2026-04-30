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
  /**
   * SWHID captured at the time this package was admitted to the database
   * (frozen, never refreshed). Used as an offline fallback when the
   * extension can't reach Software Heritage at click time. The freshest
   * SWHID is fetched live by the extension.
   */
  swhid?: string | undefined;
  /**
   * True while waiting for Software Heritage to finish archiving the
   * repository after a Save Code Now request. The backfill cron polls
   * pending entries and writes `swhid` when SWH catches up. Mutually
   * exclusive with `swhid` and `swhFailed`.
   */
  swhPending?: boolean | undefined;
  /**
   * ISO 8601 datetime when Save Code Now was triggered. Required when
   * `swhPending` is true; the cron uses it to time out after 72 hours.
   */
  swhSubmittedAt?: string | undefined;
  /**
   * True if SWH never archived the repository within the polling window
   * (72 hours). Stops the cron from continuing to poll. Mutually
   * exclusive with `swhid` and `swhPending`.
   */
  swhFailed?: boolean | undefined;
};

/**
 * Live data fetched from Software Heritage at click time and attached to a
 * matched hit. Either field may be absent — populated on a best-effort basis
 * when SWH is reachable and the package has a `repository` URL.
 */
export type SwhLive = {
  /**
   * SWH-rendered BibTeX (verbatim from
   * `/raw-intrinsic-metadata/citation/origin/`). Includes a qualified SWHID
   * with origin/visit context. Only present when the upstream repo has
   * `CITATION.cff` or `codemeta.json` indexed by SWH.
   */
  bibtex?: string | undefined;
  /**
   * Latest snapshot SWHID from `/origin/<url>/visit/latest/`. Used when no
   * SWH BibTeX is available but we still want to embed a current SWHID in
   * a locally-constructed citation.
   */
  swhid?: string | undefined;
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
  /**
   * Software Heritage data fetched live at match time. Absent when SWH was
   * unreachable, the package has no repository, or the lookup timed out.
   */
  swh?: SwhLive | undefined;
};

/** Result of the extension's package-matching process. */
export type MatchResult =
  | { kind: 'hits'; high: PackageHit[]; low: PackageHit[] }
  | { kind: 'fallback'; source: 'citeas'; hits: PackageHit[] }
  | { kind: 'miss'; reason: 'no-local' | 'fallback-disabled' | 'fallback-failed' };
