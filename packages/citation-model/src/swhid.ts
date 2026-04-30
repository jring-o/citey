/**
 * Software Heritage Persistent IDentifier (SWHID).
 *
 * Core form:        swh:1:<type>:<40-hex>
 * Qualified form:   swh:1:<type>:<40-hex>;<key>=<val>(;<key>=<val>)*
 *
 * <type> is one of: cnt (content), dir (directory), rev (revision),
 *                   rel (release), snp (snapshot).
 *
 * SWH's citation API returns qualified SWHIDs with origin/visit context
 * baked in; we accept either form.
 *
 * Spec: https://docs.softwareheritage.org/devel/swh-model/persistent-identifiers.html
 */
export const SWHID_RE = /^swh:1:(cnt|dir|rev|rel|snp):[0-9a-f]{40}(;[a-z_]+=[^;]+)*$/;

export function isValidSwhid(value: string): boolean {
  return SWHID_RE.test(value);
}
