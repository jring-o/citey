// ---------------------------------------------------------------------------
// Software Heritage — Save Code Now trigger
//
// Fire-and-forget: posts to SWH's Save Code Now endpoint to request archival
// of a repo. Success here means SWH accepted the request, not that the
// archival has finished — that takes minutes to hours and is polled by the
// backfill cron in the citey repo. Anonymous rate limit is 10/h per IP, so
// this runs from the contributor's browser (one IP per user) rather than
// from a centralized hub server.
// ---------------------------------------------------------------------------

const SWH_BASE = 'https://archive.softwareheritage.org/api/1';

export interface SwhTriggerResult {
  /** True if SWH accepted the save request (HTTP 200). */
  accepted: boolean;
  /** ISO 8601 datetime in UTC when the request was issued. */
  submittedAt: string;
}

/**
 * Request that Software Heritage archive `repoUrl`. Returns the submission
 * timestamp regardless of acceptance — the cron polls SWH's `/visit/latest/`
 * endpoint, which works whether or not this specific Save Code Now call
 * succeeded (SWH may already have the origin from a prior crawl).
 */
export async function triggerSaveCodeNow(repoUrl: string): Promise<SwhTriggerResult> {
  const submittedAt = new Date().toISOString();
  const url = `${SWH_BASE}/origin/save/git/url/${encodeURIComponent(repoUrl)}/`;

  try {
    const res = await fetch(url, { method: 'POST' });
    return { accepted: res.ok, submittedAt };
  } catch {
    // Network failure or CORS issue — treat as not-accepted but still
    // return a submittedAt so the seed YAML records the attempt.
    return { accepted: false, submittedAt };
  }
}

/** SWH archive page for an origin URL — useful for linking from a PR body. */
export function swhArchiveUrl(repoUrl: string): string {
  return `https://archive.softwareheritage.org/browse/origin/?origin_url=${encodeURIComponent(repoUrl)}`;
}
