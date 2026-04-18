#!/usr/bin/env node

/**
 * check-bundle-size.mjs
 *
 * Checks that the total size of all files in a directory does not exceed
 * a given threshold in bytes.
 *
 * Usage: node scripts/check-bundle-size.mjs <directory> <max-bytes>
 * Exit code 0 if within budget, 1 if over budget or on error.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const [dir, maxBytesArg] = process.argv.slice(2);

if (!dir || !maxBytesArg) {
  console.error("Usage: node check-bundle-size.mjs <directory> <max-bytes>");
  process.exit(1);
}

const maxBytes = Number(maxBytesArg);

if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
  console.error(`Invalid max-bytes value: ${maxBytesArg}`);
  process.exit(1);
}

/**
 * Recursively sum the size of all files in a directory.
 */
function dirSize(dirPath) {
  let total = 0;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(fullPath);
    } else if (entry.isFile()) {
      total += statSync(fullPath).size;
    }
  }
  return total;
}

let totalSize;
try {
  totalSize = dirSize(dir);
} catch (err) {
  console.error(`Failed to read directory "${dir}": ${err.message}`);
  process.exit(1);
}

const sizeMB = (totalSize / 1_048_576).toFixed(2);
const budgetMB = (maxBytes / 1_048_576).toFixed(2);

if (totalSize > maxBytes) {
  console.error(
    `Bundle size check FAILED: ${dir} is ${totalSize} bytes (${sizeMB} MB), exceeds budget of ${maxBytes} bytes (${budgetMB} MB).`,
  );
  process.exit(1);
}

console.log(
  `Bundle size OK: ${dir} is ${totalSize} bytes (${sizeMB} MB), within budget of ${maxBytes} bytes (${budgetMB} MB).`,
);
