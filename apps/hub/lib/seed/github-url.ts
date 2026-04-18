import type { Ecosystem } from "./state";

const REPO = "scios-tech/citey";
const BRANCH = "main";

/**
 * Maximum length for the encoded `value` query param. GitHub's URL limit
 * is around 8 KB total; we cap the YAML payload below that to leave room
 * for the rest of the URL.
 */
export const MAX_YAML_BYTES = 7000;

export interface BuildUrlInput {
	ecosystem: Ecosystem;
	id: string;
	yaml: string;
}

/**
 * Build a GitHub "create new file" deep-link URL that prefills the seed
 * YAML at the right path. Clicking it sends the user to GitHub's editor
 * (forking the repo automatically if needed).
 */
export function buildGithubNewFileUrl({
	ecosystem,
	id,
	yaml,
}: BuildUrlInput): string {
	const path = `data/seed/${ecosystem}`;
	const filename = `${id}.yaml`;
	const params = new URLSearchParams({ filename, value: yaml });
	return `https://github.com/${REPO}/new/${BRANCH}/${path}?${params.toString()}`;
}
