#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePackage } from '@citey/citation-model';
import type { Package } from '@citey/citation-model';
import { glob } from 'glob';
import { parse as parseYaml } from 'yaml';

import { canonicalJson } from './canonical-json.js';

// ---------------------------------------------------------------------------
// Resolve repo root (two levels up from packages/db-build/dist or src)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findRepoRoot(): string {
  // Walk up until we find pnpm-workspace.yaml
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  // Fallback: assume standard layout
  return resolve(__dirname, '..', '..', '..');
}

const REPO_ROOT = findRepoRoot();

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { seedDir: string; output: string } {
  let seedDir: string | undefined;
  let output: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--seed-dir' && i + 1 < argv.length) {
      seedDir = argv[++i];
    } else if (arg.startsWith('--seed-dir=')) {
      seedDir = arg.slice('--seed-dir='.length);
    } else if (arg === '--output' && i + 1 < argv.length) {
      output = argv[++i];
    } else if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
    }
  }

  return {
    seedDir: seedDir ?? resolve(REPO_ROOT, 'data', 'seed'),
    output: output ?? resolve(REPO_ROOT, 'apps', 'extension', 'public', 'db.json'),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { seedDir, output } = parseArgs(process.argv);

  // 1. Glob YAML files (skip files whose basename starts with '_', e.g. _template.yaml)
  const pattern = `${seedDir.replace(/\\/g, '/')}/**/*.yaml`;
  const allFiles = await glob(pattern);
  const files = allFiles.filter((f) => {
    const base = f.replace(/\\/g, '/').split('/').pop() ?? '';
    return !base.startsWith('_');
  });

  if (files.length === 0) {
    console.error(`No YAML files found in ${seedDir}`);
    process.exit(1);
  }

  // Sort files for deterministic processing order
  files.sort();

  // 2 & 3. Parse and validate each file
  const packages: Package[] = [];
  let hasErrors = false;

  for (const file of files) {
    const raw = await readFile(file, 'utf-8');
    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      console.error(`[${file}] YAML parse error: ${String(err)}`);
      hasErrors = true;
      continue;
    }

    const result = validatePackage(parsed);
    if (!result.ok) {
      for (const issue of result.errors) {
        const path = issue.path.join('.');
        console.error(`[${file}] ${path}: ${issue.message}`);
      }
      hasErrors = true;
      continue;
    }

    packages.push(result.value);
  }

  if (hasErrors) {
    process.exit(1);
  }

  // 4. Cross-validate: unique ids
  const idMap = new Map<string, string>();
  for (const pkg of packages) {
    const existing = idMap.get(pkg.id);
    if (existing !== undefined) {
      console.error(`Duplicate id "${pkg.id}" found in multiple files`);
      process.exit(1);
    }
    idMap.set(pkg.id, pkg.id);
  }

  // 4a. Cross-validate: citeAs referential integrity.
  //  - Target must exist in the package set.
  //  - Target must be a PRIMARY package (no citeAs of its own) — single
  //    level of redirection only, so the engine can resolve in O(1).
  const idToPkg = new Map(packages.map((p) => [p.id, p] as const));
  for (const pkg of packages) {
    if (pkg.citeAs === undefined) continue;
    const target = idToPkg.get(pkg.citeAs);
    if (target === undefined) {
      console.error(
        `[${pkg.id}] citeAs target "${pkg.citeAs}" does not match any known package id`,
      );
      process.exit(1);
    }
    if (target.citeAs !== undefined) {
      console.error(
        `[${pkg.id}] citeAs target "${pkg.citeAs}" is itself an alias (citeAs=${target.citeAs}). Chains are not allowed.`,
      );
      process.exit(1);
    }
  }

  // 4b. Cross-validate: alias collisions
  const aliasOwners = new Map<string, string[]>();
  for (const pkg of packages) {
    for (const alias of pkg.aliases) {
      const lower = alias.toLowerCase();
      const owners = aliasOwners.get(lower);
      if (owners !== undefined) {
        owners.push(pkg.id);
      } else {
        aliasOwners.set(lower, [pkg.id]);
      }
    }
  }

  // Build a quick lookup for package tags
  const pkgTagMap = new Map<string, Set<string>>();
  for (const pkg of packages) {
    pkgTagMap.set(pkg.id, new Set(pkg.tags ?? []));
  }

  for (const [alias, owners] of aliasOwners) {
    if (owners.length > 1) {
      // Check if all owners have "collision-allowed" tag
      const allAllowed = owners.every((id) => {
        const tags = pkgTagMap.get(id);
        return tags !== undefined && tags.has('collision-allowed');
      });
      if (!allAllowed) {
        console.error(
          `Alias collision: "${alias}" is claimed by packages: ${owners.join(', ')}`,
        );
        process.exit(1);
      }
    }
  }

  // 5. Sort packages by id
  packages.sort((a, b) => a.id.localeCompare(b.id));

  // 6. Build aliasIndex (reuse aliasOwners from step 4b)
  const sortedAliasIndex: Record<string, string[]> = {};
  for (const key of [...aliasOwners.keys()].sort()) {
    sortedAliasIndex[key] = aliasOwners.get(key)!.sort();
  }

  // 7. Compute dbVersion
  const canonical = canonicalJson(packages);
  const dbVersion = createHash('sha256').update(canonical).digest('hex').slice(0, 12);

  // 8. Build db.json artifact
  const dbArtifact = {
    schemaVersion: 1 as const,
    builtAt: new Date().toISOString(),
    dbVersion,
    packageCount: packages.length,
    packages,
    aliasIndex: sortedAliasIndex,
  };

  const jsonOutput = JSON.stringify(dbArtifact, null, 2);

  // Ensure output directory exists
  const outputDir = dirname(output);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(output, jsonOutput + '\n', 'utf-8');

  // 9. Print summary
  const aliasCount = Object.keys(sortedAliasIndex).length;
  const bytes = Buffer.byteLength(jsonOutput + '\n', 'utf-8');
  console.log(
    `package count: ${packages.length} | alias count: ${aliasCount} | dbVersion: ${dbVersion} | bytes: ${bytes}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
