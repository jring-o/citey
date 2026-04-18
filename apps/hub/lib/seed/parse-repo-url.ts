/**
 * Parse a user-pasted repo string into `{ owner, repo }`.
 *
 * Accepts:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - https://github.com/owner/repo/tree/main
 *   - git@github.com:owner/repo.git
 *   - owner/repo
 *
 * Returns `null` for unsupported hosts or malformed input.
 */
export function parseRepoUrl(
	input: string,
): { owner: string; repo: string } | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	// SSH-style: git@github.com:owner/repo(.git)
	const sshMatch = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/.exec(trimmed);
	if (sshMatch) {
		return { owner: sshMatch[1]!, repo: stripGit(sshMatch[2]!) };
	}

	// Bare slug: owner/repo
	if (/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(trimmed)) {
		const [owner, repo] = trimmed.split("/");
		return { owner: owner!, repo: stripGit(repo!) };
	}

	// URL form
	let url: URL;
	try {
		url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
	} catch {
		return null;
	}

	if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
		return null;
	}

	const segments = url.pathname.split("/").filter(Boolean);
	if (segments.length < 2) return null;

	return { owner: segments[0]!, repo: stripGit(segments[1]!) };
}

function stripGit(s: string): string {
	return s.endsWith(".git") ? s.slice(0, -4) : s;
}
