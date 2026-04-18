import type { ZodIssue } from 'zod';
import { packageSchema } from './schema.js';
import type { Package } from './types.js';

/**
 * Validate an unknown input against the Package schema.
 *
 * @returns `{ ok: true, value }` on success, `{ ok: false, errors }` on failure.
 */
export function validatePackage(
  input: unknown,
): { ok: true; value: Package } | { ok: false; errors: ZodIssue[] } {
  const result = packageSchema.safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return { ok: false, errors: result.error.issues };
}
