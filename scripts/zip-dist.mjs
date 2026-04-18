#!/usr/bin/env node

/**
 * zip-dist.mjs
 *
 * Packs a dist directory into a named .zip file using Node's built-in
 * zlib and the archive stream pattern with node:fs and node:path.
 *
 * Usage: node scripts/zip-dist.mjs <source-directory> <output-zip-path>
 * Exit code 0 on success, 1 on error.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";

const [srcDir, outputZip] = process.argv.slice(2);

if (!srcDir || !outputZip) {
  console.error("Usage: node zip-dist.mjs <source-directory> <output-zip-path>");
  process.exit(1);
}

/**
 * Recursively collect all file paths in a directory.
 */
function collectFiles(dirPath) {
  const files = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function buildLocalEntry(nameBuffer, compressed, crc, uncompressedSize) {
  const buf = Buffer.alloc(30 + nameBuffer.length + compressed.length);
  buf.writeUInt32LE(0x04034b50, 0);
  buf.writeUInt16LE(20, 4);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(8, 8);
  buf.writeUInt16LE(0, 10);
  buf.writeUInt16LE(0, 12);
  buf.writeUInt32LE(crc, 14);
  buf.writeUInt32LE(compressed.length, 18);
  buf.writeUInt32LE(uncompressedSize, 22);
  buf.writeUInt16LE(nameBuffer.length, 26);
  buf.writeUInt16LE(0, 28);
  nameBuffer.copy(buf, 30);
  compressed.copy(buf, 30 + nameBuffer.length);
  return buf;
}

function buildCentralEntry(nameBuffer, compressed, crc, uncompressedSize, localOffset) {
  const buf = Buffer.alloc(46 + nameBuffer.length);
  buf.writeUInt32LE(0x02014b50, 0);
  buf.writeUInt16LE(20, 4);
  buf.writeUInt16LE(20, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt16LE(8, 10);
  buf.writeUInt16LE(0, 12);
  buf.writeUInt16LE(0, 14);
  buf.writeUInt32LE(crc, 16);
  buf.writeUInt32LE(compressed.length, 20);
  buf.writeUInt32LE(uncompressedSize, 24);
  buf.writeUInt16LE(nameBuffer.length, 28);
  buf.writeUInt16LE(0, 30);
  buf.writeUInt16LE(0, 32);
  buf.writeUInt16LE(0, 34);
  buf.writeUInt16LE(0, 36);
  buf.writeUInt32LE(0, 38);
  buf.writeUInt32LE(localOffset, 42);
  nameBuffer.copy(buf, 46);
  return buf;
}

/**
 * Build a ZIP file buffer from a list of files relative to a base directory.
 * Implements the ZIP format (PKZIP APPNOTE 6.3.x) with DEFLATE compression.
 */
function createZip(basePath, filePaths) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const filePath of filePaths) {
    const relativePath = relative(basePath, filePath).replace(/\\/g, "/");
    const fileData = readFileSync(filePath);
    const compressed = deflateRawSync(fileData);
    const nameBuffer = Buffer.from(relativePath, "utf-8");
    const crc = crc32(fileData);

    const local = buildLocalEntry(nameBuffer, compressed, crc, fileData.length);
    const central = buildCentralEntry(nameBuffer, compressed, crc, fileData.length, offset);

    localHeaders.push(local);
    centralHeaders.push(central);
    offset += local.length;
  }

  const centralDirSize = centralHeaders.reduce((s, b) => s + b.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralHeaders.length, 8);
  eocd.writeUInt16LE(centralHeaders.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

/**
 * CRC-32 calculation.
 */
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Main
try {
  const absDir = resolve(srcDir);
  const files = collectFiles(absDir);

  if (files.length === 0) {
    console.error(`No files found in "${srcDir}".`);
    process.exit(1);
  }

  const zipBuffer = createZip(absDir, files);
  writeFileSync(outputZip, zipBuffer);
  console.log(`Created ${outputZip} (${zipBuffer.length} bytes, ${files.length} files).`);
} catch (err) {
  console.error(`Failed to create zip: ${err.message}`);
  process.exit(1);
}
