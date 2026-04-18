import { parse as parseYaml } from "yaml";

const BRANCHES = ["main", "master"] as const;

export interface FetchedMetadata {
	cff?: unknown;
	codemeta?: unknown;
	cffBranch?: string;
	codemetaBranch?: string;
}

async function tryFetchText(url: string): Promise<string | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		return await res.text();
	} catch {
		return null;
	}
}

/**
 * Fetch CITATION.cff and codemeta.json from a GitHub repo, trying main
 * then master. Returns whichever files were found (parsed). Network /
 * parse errors are swallowed silently per file — a missing file is the
 * common case, not an error.
 */
export async function fetchRepoMetadata(
	owner: string,
	repo: string,
): Promise<FetchedMetadata> {
	const result: FetchedMetadata = {};

	for (const branch of BRANCHES) {
		if (!result.cff) {
			const text = await tryFetchText(
				`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/CITATION.cff`,
			);
			if (text) {
				try {
					result.cff = parseYaml(text);
					result.cffBranch = branch;
				} catch {
					/* invalid YAML — treat as missing */
				}
			}
		}

		if (!result.codemeta) {
			const text = await tryFetchText(
				`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/codemeta.json`,
			);
			if (text) {
				try {
					result.codemeta = JSON.parse(text);
					result.codemetaBranch = branch;
				} catch {
					/* invalid JSON */
				}
			}
		}

		if (result.cff && result.codemeta) break;
	}

	return result;
}
