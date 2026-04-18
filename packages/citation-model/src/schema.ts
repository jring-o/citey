import { z } from 'zod';
import { ORCID_RE, verifyOrcidChecksum } from './orcid.js';
import { KNOWN_LICENSES } from './spdx.js';
import type {
  Author,
  Ecosystem,
  Package,
  Provenance,
  SoftwareCitation,
} from './types.js';

// ---------------------------------------------------------------------------
// Shared patterns
// ---------------------------------------------------------------------------

/** Kebab-case package id: lowercase alphanumeric segments separated by hyphens, max 64 chars. */
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Alias: starts with lowercase alphanumeric, then up to 63 more of [a-z0-9._+-]. */
const ALIAS_RE = /^[a-z0-9][a-z0-9._+\-]{0,63}$/;

/** DOI canonical form. */
const DOI_RE = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

/** ISO 8601 date (YYYY-MM-DD). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Ecosystem & VersionPolicy
// ---------------------------------------------------------------------------

export const ecosystemSchema = z.enum([
  'pypi',
  'cran',
  'npm',
  'julia',
  'generic',
]) satisfies z.ZodType<Ecosystem>;

export const versionPolicySchema = z.enum([
  'latest',
  'preferred-version',
  'unversioned',
]);

// ---------------------------------------------------------------------------
// Author
// ---------------------------------------------------------------------------

export const authorSchema: z.ZodType<Author, z.ZodTypeDef, unknown> = z.object({
  family: z.string().min(1),
  given: z.string(), // may be empty for organizations
  orcid: z
    .string()
    .regex(ORCID_RE, 'ORCID must be in 0000-0000-0000-000X format')
    .refine(verifyOrcidChecksum, 'ORCID checksum failed')
    .optional(),
  affiliation: z.string().optional(),
  kind: z.enum(['person', 'organization']),
});

// ---------------------------------------------------------------------------
// SoftwareCitation
// ---------------------------------------------------------------------------

/** Year string: 4 digits in [1970, current year + 1]. */
const yearString = z
  .string()
  .regex(/^\d{4}$/, 'Year must be a 4-digit string')
  .refine(
    (y) => {
      const n = Number(y);
      return n >= 1970 && n <= new Date().getFullYear() + 1;
    },
    { message: 'Year out of allowed range [1970, current year + 1]' },
  );

export const softwareCitationSchema: z.ZodType<
  SoftwareCitation,
  z.ZodTypeDef,
  unknown
> = z
  .object({
    title: z.string().min(1),
    authors: z.array(authorSchema).min(1),
    year: yearString,
    version: z.string().min(1).optional(),
    doi: z.string().regex(DOI_RE, 'DOI must match canonical format').optional(),
    url: z.string().url().optional(),
    publisher: z.string().min(1).optional(),
  })
  .superRefine((c, ctx) => {
    if (c.doi === undefined && c.url === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either "doi" or "url" is required',
        path: [],
      });
    }
  });

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export const provenanceSchema: z.ZodType<Provenance, z.ZodTypeDef, unknown> = z.object({
  source: z.enum(['hand-curated', 'imported']),
  curator: z.string().min(1),
  dateAdded: z.string().regex(ISO_DATE_RE, 'Must be ISO 8601 date'),
  lastReviewed: z.string().regex(ISO_DATE_RE, 'Must be ISO 8601 date'),
  sourceUrl: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// Package
// ---------------------------------------------------------------------------

export const packageSchema: z.ZodType<Package, z.ZodTypeDef, unknown> = z
  .object({
    id: z
      .string()
      .max(64)
      .regex(ID_RE, 'id must be kebab-case ASCII, max 64 chars'),
    canonicalName: z.string().min(1).max(80),
    aliases: z
      .array(z.string().regex(ALIAS_RE, 'alias must match ^[a-z0-9][a-z0-9._+-]{0,63}$'))
      .min(1)
      .max(32),
    ecosystem: ecosystemSchema,
    description: z.string().min(1).max(280),
    // The next two are required for primary packages; optional for
    // `citeAs` redirects (verified in the superRefine below).
    homepage: z.string().url().optional(),
    repository: z.string().url().optional(),
    license: z
      .string()
      .refine((l) => KNOWN_LICENSES.has(l), {
        message: 'License must be a valid SPDX 3.x identifier',
      })
      .optional(),
    dois: z
      .array(z.string().regex(DOI_RE, 'DOI must match canonical format'))
      .optional(),
    citation: softwareCitationSchema.optional(),
    tags: z
      .array(z.string().regex(ID_RE, 'Tag must be lowercase kebab-case'))
      .max(10)
      .optional(),
    provenance: provenanceSchema,
    versionPolicy: versionPolicySchema,
    preferredVersion: z.string().optional(),
    notes: z.string().max(500).optional(),
    citeAs: z
      .string()
      .max(64)
      .regex(ID_RE, 'citeAs must be a kebab-case package id')
      .optional(),
  })
  .superRefine((pkg, ctx) => {
    // aliases must include the lowercased canonicalName
    const lowerCanonical = pkg.canonicalName.toLowerCase();
    if (!pkg.aliases.includes(lowerCanonical)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'aliases must include the lowercased canonicalName',
        path: ['aliases'],
      });
    }

    // aliases must be unique within the package
    const seen = new Set<string>();
    for (let i = 0; i < pkg.aliases.length; i++) {
      if (seen.has(pkg.aliases[i]!)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate alias: "${pkg.aliases[i]}"`,
          path: ['aliases', i],
        });
      }
      seen.add(pkg.aliases[i]!);
    }

    if (pkg.citeAs !== undefined) {
      // ALIAS entry — must not re-declare citation data.
      if (pkg.citeAs === pkg.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'citeAs must not point at the package itself',
          path: ['citeAs'],
        });
      }
      for (const field of ['dois', 'citation', 'preferredVersion'] as const) {
        if (pkg[field] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `"${field}" must not be set on a package with citeAs — those fields live on the parent citation`,
            path: [field],
          });
        }
      }
      if (pkg.versionPolicy !== 'unversioned') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'versionPolicy must be "unversioned" when citeAs is set',
          path: ['versionPolicy'],
        });
      }
    } else {
      // PRIMARY entry — citation fields required.
      if (pkg.homepage === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'homepage is required unless citeAs is set',
          path: ['homepage'],
        });
      }
      if (pkg.citation === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'citation is required unless citeAs is set',
          path: ['citation'],
        });
      }
    }
  });
