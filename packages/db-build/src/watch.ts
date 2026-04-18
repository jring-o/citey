#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, utimesSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { watch } from 'chokidar';

// ---------------------------------------------------------------------------
// Resolve repo root
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findRepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return resolve(__dirname, '..', '..', '..');
}

const REPO_ROOT = findRepoRoot();

// ---------------------------------------------------------------------------
// Paths to watch
// ---------------------------------------------------------------------------

const SEED_GLOB = resolve(REPO_ROOT, 'data', 'seed', '**', '*.yaml').replace(
  /\\/g,
  '/',
);
const MODEL_SRC = resolve(REPO_ROOT, 'packages', 'citation-model', 'src', '**', '*.ts').replace(
  /\\/g,
  '/',
);
const DB_JSON_PATH = resolve(REPO_ROOT, 'apps', 'extension', 'public', 'db.json');
const CLI_PATH = resolve(__dirname, 'index.js');

// ---------------------------------------------------------------------------
// Build runner
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function runBuild(): void {
  const start = performance.now();
  let ok = true;
  try {
    execFileSync(process.execPath, [CLI_PATH], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });

    // Touch db.json to nudge Vite HMR
    if (existsSync(DB_JSON_PATH)) {
      const now = new Date();
      utimesSync(DB_JSON_PATH, now, now);
    }
  } catch {
    ok = false;
  }

  const elapsed = (performance.now() - start).toFixed(0);
  if (ok) {
    console.log(`[db-build] rebuilt in ${elapsed} ms`);
  } else {
    console.error(`[db-build] build failed (${elapsed} ms)`);
  }
}

function scheduleBuild(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runBuild();
  }, 100);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // Ensure output directory exists
  const outputDir = dirname(DB_JSON_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Initial build
  runBuild();

  // Set up watcher
  const watcher = watch([SEED_GLOB, MODEL_SRC], {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  });

  watcher.on('add', scheduleBuild);
  watcher.on('change', scheduleBuild);
  watcher.on('unlink', scheduleBuild);

  console.log(`[db-build] watching data/seed/ and citation-model/src/`);
  console.log(`[db-build] press Ctrl+C to stop`);
}

main();
