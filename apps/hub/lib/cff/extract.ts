import { KNOWN_LICENSES } from "@citey/citation-model";

export type ExtractErrorCode =
	| "invalid_url"
	| "not_found"
	| "rate_limited"
	| "network";

export class ExtractError extends Error {
	code: ExtractErrorCode;
	resetAt?: string;
	constructor(code: ExtractErrorCode, message: string, resetAt?: string) {
		super(message);
		this.name = "ExtractError";
		this.code = code;
		this.resetAt = resetAt;
	}
}

export interface ExtractedAuthor {
	family: string;
	given: string;
	orcid: string;
	affiliation: string;
	kind: "person";
}

export interface ExtractResult {
	title?: string;
	version?: string;
	dateReleased?: string;
	repositoryCode?: string;
	url?: string;
	license?: string;
	keywords?: string;
	abstract?: string;
	authors?: ExtractedAuthor[];
}

const VALID_PART_RE = /^[A-Za-z0-9._-]+$/;

export function parseGithubUrl(
	input: string,
): { owner: string; repo: string } | null {
	const trimmed = input.trim();
	if (trimmed === "") return null;

	if (
		!trimmed.startsWith("http://") &&
		!trimmed.startsWith("https://")
	) {
		return null;
	}

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return null;
	}

	let hostname = parsed.hostname.toLowerCase();
	if (hostname.startsWith("www.")) {
		hostname = hostname.slice(4);
	}
	if (hostname !== "github.com") return null;

	let pathname = parsed.pathname;
	// Strip leading /
	if (pathname.startsWith("/")) {
		pathname = pathname.slice(1);
	}
	// Strip trailing /
	if (pathname.endsWith("/")) {
		pathname = pathname.slice(0, -1);
	}
	// Strip trailing .git (case-insensitive)
	if (pathname.toLowerCase().endsWith(".git")) {
		pathname = pathname.slice(0, -4);
	}
	// Drop any path segments beyond the second
	const segments = pathname.split("/");
	if (segments.length < 2) return null;
	const owner = segments[0];
	const repo = segments[1];

	if (!owner || !repo) return null;
	if (!VALID_PART_RE.test(owner) || !VALID_PART_RE.test(repo)) return null;

	return { owner, repo };
}

function isBot(c: { login: string; type: string }): boolean {
	if (c.type === "Bot") return true;
	if (/\[bot\]$|^dependabot|^github-actions/i.test(c.login)) return true;
	return false;
}

function safeLicense(spdx?: string | null): string | undefined {
	if (typeof spdx !== "string") return undefined;
	const trimmed = spdx.trim();
	if (trimmed === "") return undefined;
	return KNOWN_LICENSES.has(trimmed) ? trimmed : undefined;
}

function splitName(name: string): { family: string; given: string } {
	const collapsed = name.trim().replace(/\s+/g, " ");
	if (collapsed === "") {
		return { family: "", given: "" };
	}
	if (collapsed.includes(",")) {
		const commaIdx = collapsed.indexOf(",");
		return {
			family: collapsed.slice(0, commaIdx).trim(),
			given: collapsed.slice(commaIdx + 1).trim(),
		};
	}
	const spaceIdx = collapsed.lastIndexOf(" ");
	if (spaceIdx === -1) {
		return { family: collapsed, given: "" };
	}
	return {
		family: collapsed.slice(spaceIdx + 1),
		given: collapsed.slice(0, spaceIdx).trim(),
	};
}

async function ghFetch(url: string): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(url, { cache: "no-store" });
	} catch {
		throw new ExtractError("network", "Could not reach GitHub");
	}
	if (
		res.status === 403 &&
		res.headers.get("x-ratelimit-remaining") === "0"
	) {
		const resetHeader = res.headers.get("x-ratelimit-reset");
		const resetAt = resetHeader
			? new Date(parseInt(resetHeader, 10) * 1000).toISOString()
			: undefined;
		throw new ExtractError("rate_limited", "GitHub rate limit reached", resetAt);
	}
	return res;
}

function extractRepoFields(repoData: Record<string, unknown>): ExtractResult {
	const result: ExtractResult = {};

	const repoName = repoData.name;
	if (typeof repoName === "string" && repoName.trim() !== "") {
		result.title = repoName.trim();
	}

	if (repoData.html_url) {
		result.repositoryCode = repoData.html_url as string;
		result.url = repoData.html_url as string;
	}

	if (
		typeof repoData.description === "string" &&
		repoData.description.trim() !== ""
	) {
		result.abstract = repoData.description;
	}

	if (Array.isArray(repoData.topics) && repoData.topics.length > 0) {
		result.keywords = repoData.topics.join(", ");
	}

	const license = safeLicense(
		(repoData.license as Record<string, unknown> | null)?.spdx_id as
			| string
			| undefined,
	);
	if (license !== undefined) {
		result.license = license;
	}

	return result;
}

async function extractVersion(
	base: string,
): Promise<{ version?: string; dateReleased?: string }> {
	const releaseRes = await ghFetch(`${base}/releases/latest`);

	if (releaseRes.ok) {
		const releaseData = await releaseRes.json();
		const partial: { version?: string; dateReleased?: string } = {};
		if (typeof releaseData.tag_name === "string") {
			const tag = releaseData.tag_name;
			partial.version = tag.startsWith("v") ? tag.slice(1) : tag;
		}
		if (
			typeof releaseData.published_at === "string" &&
			releaseData.published_at
		) {
			partial.dateReleased = releaseData.published_at.slice(0, 10);
			return partial;
		}
		return { ...partial, ...(await extractCommitDate(base)) };
	}

	if (releaseRes.status === 404) {
		return extractCommitDate(base);
	}

	throw new ExtractError("network", "Could not reach GitHub");
}

async function extractCommitDate(
	base: string,
): Promise<{ dateReleased?: string }> {
	const commitsRes = await ghFetch(`${base}/commits?per_page=1`);

	if (commitsRes.ok) {
		const commitsData = await commitsRes.json();
		if (
			Array.isArray(commitsData) &&
			commitsData.length > 0 &&
			commitsData[0]?.commit?.author?.date
		) {
			return {
				dateReleased: commitsData[0].commit.author.date.slice(0, 10),
			};
		}
	} else if (commitsRes.status !== 404 && commitsRes.status !== 409) {
		throw new ExtractError("network", "Could not reach GitHub");
	}

	return {};
}

async function extractAuthors(base: string): Promise<ExtractedAuthor[]> {
	const contributorsRes = await ghFetch(`${base}/contributors?per_page=10`);

	let contributors: { login: string; type: string }[] = [];
	if (contributorsRes.status === 204 || contributorsRes.status === 404) {
		contributors = [];
	} else if (contributorsRes.ok) {
		const contribData = await contributorsRes.json();
		if (Array.isArray(contribData)) {
			contributors = contribData;
		}
	} else {
		throw new ExtractError("network", "Could not reach GitHub");
	}

	const survivors = contributors.filter((c) => !isBot(c));
	if (survivors.length === 0) return [];

	const userResponses = await Promise.all(
		survivors.map((c) =>
			ghFetch(
				`https://api.github.com/users/${encodeURIComponent(c.login)}`,
			),
		),
	);

	const authors: ExtractedAuthor[] = [];
	for (const userRes of userResponses) {
		if (!userRes.ok) continue;

		const userData = await userRes.json();
		const name = userData.name;
		if (typeof name !== "string" || name.trim() === "") continue;

		const { family, given } = splitName(name);
		if (family === "") continue;

		authors.push({
			family,
			given,
			orcid: "",
			affiliation: "",
			kind: "person",
		});
	}

	return authors;
}

export async function extractFromGithub(url: string): Promise<ExtractResult> {
	const parsed = parseGithubUrl(url);
	if (!parsed) {
		throw new ExtractError("invalid_url", "Not a GitHub repo URL");
	}
	const { owner, repo } = parsed;
	const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

	const repoRes = await ghFetch(base);
	if (repoRes.status === 404) {
		throw new ExtractError("not_found", "Repo not found or private");
	}
	if (!repoRes.ok) {
		throw new ExtractError("network", "Could not reach GitHub");
	}

	const repoData = await repoRes.json();
	const result: ExtractResult = {
		...extractRepoFields(repoData),
		...(await extractVersion(base)),
		authors: await extractAuthors(base),
	};

	return result;
}
