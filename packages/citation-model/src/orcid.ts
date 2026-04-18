/** ORCID format (four groups of four digits, last char may be X). */
export const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/**
 * Verify the ORCID checksum for a given ORCID iD string.
 *
 * ORCID iDs follow the format `0000-0000-0000-000X` where X is a check digit
 * calculated using the ISO/IEC 7064:2003, MOD 11,2 algorithm.
 *
 * @see https://support.orcid.org/hc/en-us/articles/360006897674-Structure-of-the-ORCID-Identifier
 */
export function verifyOrcidChecksum(orcid: string): boolean {
  if (!ORCID_RE.test(orcid)) {
    return false;
  }

  const digits = orcid.replace(/-/g, '');
  let total = 0;

  for (let i = 0; i < digits.length - 1; i++) {
    const digit = Number(digits[i]);
    total = (total + digit) * 2;
  }

  const remainder = total % 11;
  const checkDigit = (12 - remainder) % 11;
  const expected = checkDigit === 10 ? 'X' : String(checkDigit);

  return digits[digits.length - 1] === expected;
}
