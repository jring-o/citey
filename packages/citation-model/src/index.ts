// Types
export type {
  Author,
  AuthorKind,
  Ecosystem,
  MatchResult,
  Package,
  PackageHit,
  Provenance,
  SoftwareCitation,
  VersionPolicy,
} from './types.js';

// Zod schemas
export {
  authorSchema,
  ecosystemSchema,
  packageSchema,
  provenanceSchema,
  softwareCitationSchema,
  versionPolicySchema,
} from './schema.js';

// Validation helper
export { validatePackage } from './validate.js';

// ORCID checksum verification
export { verifyOrcidChecksum } from './orcid.js';

// Fuzzy blocklist
export { FUZZY_BLOCKLIST } from './fuzzy-blocklist.js';

// SPDX license list
export { KNOWN_LICENSES } from './spdx.js';
