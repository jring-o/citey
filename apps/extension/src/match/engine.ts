// ---------------------------------------------------------------------------
// §6.2 — Match engine orchestrator
// ---------------------------------------------------------------------------

import type { MatchResult, Package, PackageHit } from '@citey/citation-model';
import { FUZZY_BLOCKLIST } from '@citey/citation-model';
import { tokenize } from './normalize.js';
import { multiTokenWindows } from './multi-token.js';
import { fuzzyMatch } from './fuzzy.js';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export type MatchInput = {
  query: string;
  byId: Map<string, Package>;
  aliasIndex: Map<string, string[]>;
};

// ---------------------------------------------------------------------------
// Internal accumulator for per-package dedup
// ---------------------------------------------------------------------------

type HitAccumulator = {
  pkg: Package;
  confidence: 'high' | 'low';
  matchedAliases: Set<string>;
  fuseScore?: number | undefined;
  /**
   * Sub-module `canonicalName`s that matched and redirected here via
   * `citeAs`. Preserves dedupe order and breadcrumb attribution for the UI.
   */
  matchedVia: Set<string>;
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the full match pipeline on `query`:
 *  1. Normalize and tokenize
 *  2. Exact alias lookup (single-token)
 *  3. Multi-token alias lookup (2/3-token windows)
 *  4. Fuzzy match (Fuse.js) for tokens with no exact hit, >=4 chars, not blocklisted
 *
 * Returns `MatchResult` per §6.4.
 */
export function match(input: MatchInput): MatchResult {
  const { query, byId, aliasIndex } = input;
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return { kind: 'miss', reason: 'no-local' };
  }

  const hits = new Map<string, HitAccumulator>();

  const exactHitIndices = exactSingleTokenLookup(tokens, aliasIndex, byId, hits);
  const suppressedIndices = multiTokenLookup(tokens, aliasIndex, byId, hits, exactHitIndices);
  fuzzyLookup(tokens, aliasIndex, byId, hits, exactHitIndices, suppressedIndices);

  return buildResult(hits);
}

/**
 * Resolve a raw alias-package hit to the package whose citation should
 * actually be presented to the user. If `pkg.citeAs` is set and points to
 * a loaded parent, return the parent and record the sub-module's
 * canonicalName as a `matchedVia` breadcrumb. Otherwise returns the
 * original package.
 *
 * Single-level redirection only — the schema + builder already guarantee
 * the parent does not itself have `citeAs`.
 */
function resolveCiteAs(
  pkg: Package,
  byId: Map<string, Package>,
): { finalPkg: Package; matchedVia?: string } {
  if (pkg.citeAs === undefined) return { finalPkg: pkg };
  const parent = byId.get(pkg.citeAs);
  if (parent === undefined) {
    // Unknown target — fail safe by keeping the child in place rather
    // than silently dropping the hit.
    return { finalPkg: pkg };
  }
  return { finalPkg: parent, matchedVia: pkg.canonicalName };
}

// ---------------------------------------------------------------------------
// Stage 1: Exact single-token alias lookup
// ---------------------------------------------------------------------------

function exactSingleTokenLookup(
  tokens: string[],
  aliasIndex: Map<string, string[]>,
  byId: Map<string, Package>,
  hits: Map<string, HitAccumulator>,
): Set<number> {
  const exactHitIndices = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const ids = aliasIndex.get(token);
    if (ids) {
      exactHitIndices.add(i);
      for (const id of ids) {
        const pkg = byId.get(id);
        if (pkg) {
          upsertHit(hits, byId, pkg, 'high', token);
        }
      }
    }
  }

  return exactHitIndices;
}

// ---------------------------------------------------------------------------
// Stage 2: Multi-token alias lookup + single-token suppression
// ---------------------------------------------------------------------------

function multiTokenLookup(
  tokens: string[],
  aliasIndex: Map<string, string[]>,
  byId: Map<string, Package>,
  hits: Map<string, HitAccumulator>,
  exactHitIndices: Set<number>,
): Set<number> {
  const windows = multiTokenWindows(tokens);
  const suppressedIndices = new Set<number>();

  for (const win of windows) {
    const ids = aliasIndex.get(win.joined) ?? aliasIndex.get(win.canonical);
    if (ids) {
      for (const id of ids) {
        const pkg = byId.get(id);
        if (pkg) {
          upsertHit(hits, byId, pkg, 'high', win.canonical);
        }
      }
      for (const idx of win.indices) {
        suppressedIndices.add(idx);
      }
    }
  }

  // Remove single-token hits whose tokens are fully covered by a multi-token
  // window (e.g. "scikit" alone is suppressed if "scikit learn" matched).
  // A package is removed only if all its matched aliases came from suppressed tokens.
  //
  // The hits map is keyed by the *resolved* parent id (see `upsertHit`), so
  // we resolve each candidate id the same way before the lookup.
  for (const idx of suppressedIndices) {
    if (!exactHitIndices.has(idx)) continue;
    const token = tokens[idx]!;
    const ids = aliasIndex.get(token);
    if (!ids) continue;
    for (const id of ids) {
      const candidate = byId.get(id);
      if (!candidate) continue;
      const { finalPkg } = resolveCiteAs(candidate, byId);
      const acc = hits.get(finalPkg.id);
      if (!acc) continue;
      acc.matchedAliases.delete(token);
      if (acc.matchedAliases.size === 0) {
        hits.delete(finalPkg.id);
      }
    }
  }

  return suppressedIndices;
}

// ---------------------------------------------------------------------------
// Stage 3: Fuzzy matching
// ---------------------------------------------------------------------------

function fuzzyLookup(
  tokens: string[],
  aliasIndex: Map<string, string[]>,
  byId: Map<string, Package>,
  hits: Map<string, HitAccumulator>,
  exactHitIndices: Set<number>,
  suppressedIndices: Set<number>,
): void {
  const allAliases = Array.from(aliasIndex.keys());

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    if (exactHitIndices.has(i)) continue;
    if (suppressedIndices.has(i)) continue;
    if (token.length < 4) continue;
    if (FUZZY_BLOCKLIST.has(token)) continue;

    const fuzzyHits = fuzzyMatch(token, allAliases);
    for (const fh of fuzzyHits) {
      const confidence: 'high' | 'low' = fh.score <= 0.05 ? 'high' : 'low';
      const ids = aliasIndex.get(fh.alias);
      if (!ids) continue;
      for (const id of ids) {
        const pkg = byId.get(id);
        if (pkg) {
          upsertHit(hits, byId, pkg, confidence, fh.alias, fh.score);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Build final result from accumulated hits
// ---------------------------------------------------------------------------

function buildResult(hits: Map<string, HitAccumulator>): MatchResult {
  if (hits.size === 0) {
    return { kind: 'miss', reason: 'no-local' };
  }

  const high: PackageHit[] = [];
  const low: PackageHit[] = [];

  for (const acc of hits.values()) {
    const hit: PackageHit = {
      package: acc.pkg,
      confidence: acc.confidence,
      matchedAliases: Array.from(acc.matchedAliases),
      ...(acc.fuseScore !== undefined ? { fuseScore: acc.fuseScore } : {}),
      ...(acc.matchedVia.size > 0 ? { matchedVia: Array.from(acc.matchedVia) } : {}),
    };
    if (acc.confidence === 'high') {
      high.push(hit);
    } else {
      low.push(hit);
    }
  }

  return { kind: 'hits', high, low };
}

// ---------------------------------------------------------------------------
// Internal helper: upsert a hit into the accumulator map
// ---------------------------------------------------------------------------

/** Return the higher confidence level. */
function maxConfidence(a: 'high' | 'low', b: 'high' | 'low'): 'high' | 'low' {
  return a === 'high' || b === 'high' ? 'high' : 'low';
}

function upsertHit(
  map: Map<string, HitAccumulator>,
  byId: Map<string, Package>,
  pkg: Package,
  confidence: 'high' | 'low',
  alias: string,
  fuseScore?: number,
): void {
  // Resolve citeAs → parent before keying the accumulator. Dedupe
  // happens naturally: direct hits on the parent and hits on any of its
  // alias sub-packages end up in the same bucket.
  const { finalPkg, matchedVia } = resolveCiteAs(pkg, byId);

  const existing = map.get(finalPkg.id);
  if (existing) {
    existing.confidence = maxConfidence(existing.confidence, confidence);
    existing.matchedAliases.add(alias);
    if (matchedVia !== undefined) existing.matchedVia.add(matchedVia);
    if (
      fuseScore !== undefined &&
      (existing.fuseScore === undefined || fuseScore < existing.fuseScore)
    ) {
      existing.fuseScore = fuseScore;
    }
  } else {
    map.set(finalPkg.id, {
      pkg: finalPkg,
      confidence,
      matchedAliases: new Set([alias]),
      matchedVia: matchedVia !== undefined ? new Set([matchedVia]) : new Set(),
      fuseScore,
    });
  }
}
