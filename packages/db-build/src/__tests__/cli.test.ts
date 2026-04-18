import { execFile } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the CLI entry point (source, executed via tsx or node)
const CLI_PATH = resolve(__dirname, '..', 'index.ts');

// Fixture directories
const FIXTURES_DIR = resolve(__dirname, 'fixtures');
const GOOD_SEED = resolve(FIXTURES_DIR, 'good');
const BAD_MISSING_FIELD_SEED = resolve(FIXTURES_DIR, 'bad-missing-field');
const BAD_INVALID_ID_SEED = resolve(FIXTURES_DIR, 'bad-invalid-id');
const BAD_ALIAS_COLLISION_SEED = resolve(FIXTURES_DIR, 'bad-alias-collision');
const BAD_ORCID_SEED = resolve(FIXTURES_DIR, 'bad-orcid');

// Temp output directory for tests
const TMP_DIR = resolve(__dirname, '__tmp__');

function runCliSimple(
  seedDir: string,
  outputPath: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((res) => {
    const proc = execFile(
      'npx',
      ['tsx', CLI_PATH, '--seed-dir', seedDir, '--output', outputPath],
      { cwd: resolve(__dirname, '..', '..', '..', '..'), shell: true },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      res({ code: code ?? 1, stdout, stderr });
    });
  });
}

describe('db-build CLI', () => {
  beforeAll(() => {
    if (!existsSync(TMP_DIR)) {
      mkdirSync(TMP_DIR, { recursive: true });
    }
  });

  afterAll(async () => {
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true });
    }
  });

  describe('known-good fixture', () => {
    const outputPath = resolve(TMP_DIR, 'good-db.json');

    it('exits with code 0 and produces valid db.json', async () => {
      const result = await runCliSimple(GOOD_SEED, outputPath);
      expect(result.code).toBe(0);
      expect(existsSync(outputPath)).toBe(true);

      const db = JSON.parse(readFileSync(outputPath, 'utf-8')) as Record<string, unknown>;

      // Check top-level keys
      const keys = Object.keys(db);
      expect(keys).toEqual([
        'schemaVersion',
        'builtAt',
        'dbVersion',
        'packageCount',
        'packages',
        'aliasIndex',
      ]);

      // Check package count
      expect(db['packageCount']).toBe(3);

      // Check schemaVersion
      expect(db['schemaVersion']).toBe(1);

      // Check dbVersion format
      expect(db['dbVersion']).toMatch(/^[0-9a-f]{12}$/);

      // Check builtAt is ISO 8601
      expect(typeof db['builtAt']).toBe('string');
      expect(new Date(db['builtAt'] as string).toISOString()).toBeTruthy();

      // Check packages are sorted by id
      const packages = db['packages'] as Array<{ id: string }>;
      const ids = packages.map((p) => p.id);
      expect(ids).toEqual([...ids].sort());
    }, 30000);

    it('prints summary line with expected fields', async () => {
      const result = await runCliSimple(GOOD_SEED, resolve(TMP_DIR, 'good-db-summary.json'));
      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/package count: 3/);
      expect(result.stdout).toMatch(/alias count:/);
      expect(result.stdout).toMatch(/dbVersion:/);
      expect(result.stdout).toMatch(/bytes:/);
    }, 30000);
  });

  describe('bad fixtures', () => {
    it('exits non-zero for missing required field', async () => {
      const outputPath = resolve(TMP_DIR, 'bad-missing.json');
      const result = await runCliSimple(BAD_MISSING_FIELD_SEED, outputPath);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('missing-desc.yaml');
    }, 30000);

    it('exits non-zero for invalid id regex', async () => {
      const outputPath = resolve(TMP_DIR, 'bad-id.json');
      const result = await runCliSimple(BAD_INVALID_ID_SEED, outputPath);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('upper-case-id.yaml');
    }, 30000);

    it('exits non-zero for alias collision', async () => {
      const outputPath = resolve(TMP_DIR, 'bad-collision.json');
      const result = await runCliSimple(BAD_ALIAS_COLLISION_SEED, outputPath);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('shared-alias');
    }, 30000);

    it('exits non-zero for ORCID checksum failure', async () => {
      const outputPath = resolve(TMP_DIR, 'bad-orcid.json');
      const result = await runCliSimple(BAD_ORCID_SEED, outputPath);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain('bad-orcid.yaml');
    }, 30000);
  });

  describe('determinism', () => {
    it('produces identical dbVersion for the same seed', async () => {
      const output1 = resolve(TMP_DIR, 'det-1.json');
      const output2 = resolve(TMP_DIR, 'det-2.json');

      const result1 = await runCliSimple(GOOD_SEED, output1);
      const result2 = await runCliSimple(GOOD_SEED, output2);

      expect(result1.code).toBe(0);
      expect(result2.code).toBe(0);

      const db1 = JSON.parse(readFileSync(output1, 'utf-8')) as { dbVersion: string };
      const db2 = JSON.parse(readFileSync(output2, 'utf-8')) as { dbVersion: string };

      expect(db1.dbVersion).toBe(db2.dbVersion);
      expect(db1.dbVersion).toMatch(/^[0-9a-f]{12}$/);
    }, 30000);
  });
});
