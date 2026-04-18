import {
	emptyAuthor,
	initialSeedFormState,
	type Ecosystem,
	type SeedAuthor,
	type SeedFormState,
} from "./state";

interface CffAuthor {
	"family-names"?: string;
	"given-names"?: string;
	name?: string;
	orcid?: string;
	affiliation?: string;
}

interface CffPreferredCitation {
	year?: number | string;
	doi?: string;
	url?: string;
	publisher?: string;
	authors?: CffAuthor[];
}

interface CffShape {
	title?: string;
	abstract?: string;
	url?: string;
	"repository-code"?: string;
	license?: string;
	doi?: string;
	version?: string;
	"date-released"?: string;
	authors?: CffAuthor[];
	"preferred-citation"?: CffPreferredCitation;
}

interface CodemetaAuthor {
	familyName?: string;
	givenName?: string;
	name?: string;
	"@id"?: string;
	email?: string;
	affiliation?: string | { name?: string };
}

interface CodemetaShape {
	name?: string;
	description?: string;
	url?: string;
	codeRepository?: string;
	license?: string;
	identifier?: string;
	version?: string;
	dateCreated?: string;
	datePublished?: string;
	programmingLanguage?: string | string[];
	author?: CodemetaAuthor | CodemetaAuthor[];
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
}

function stripOrcidPrefix(s: string): string {
	return s.replace(/^https?:\/\/orcid\.org\//i, "");
}

function stripSpdxLicensePrefix(s: string): string {
	return s.replace(/^https?:\/\/spdx\.org\/licenses\//i, "");
}

function stripDoiPrefix(s: string): string {
	return s.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
}

function ecosystemFromLanguage(langs: string | string[] | undefined): Ecosystem {
	if (!langs) return "generic";
	const list = (Array.isArray(langs) ? langs : [langs]).map((l) =>
		l.toLowerCase(),
	);
	if (list.some((l) => l.includes("python"))) return "pypi";
	if (list.some((l) => l === "r")) return "cran";
	if (
		list.some(
			(l) =>
				l.includes("javascript") ||
				l.includes("typescript") ||
				l.includes("node"),
		)
	)
		return "npm";
	if (list.some((l) => l.includes("julia"))) return "julia";
	return "generic";
}

function cffAuthorToSeed(a: CffAuthor): SeedAuthor {
	const family = a["family-names"] ?? a.name ?? "";
	const given = a["given-names"] ?? "";
	const orcid = a.orcid ? stripOrcidPrefix(a.orcid) : "";
	return {
		family,
		given,
		kind: family && !given && a.name ? "organization" : "person",
		orcid,
		affiliation: a.affiliation ?? "",
	};
}

function codemetaAuthorToSeed(a: CodemetaAuthor): SeedAuthor {
	const family = a.familyName ?? a.name ?? "";
	const given = a.givenName ?? "";
	const orcid = a["@id"] ? stripOrcidPrefix(a["@id"]) : "";
	const affiliation =
		typeof a.affiliation === "string"
			? a.affiliation
			: a.affiliation?.name ?? "";
	return {
		family,
		given,
		kind: family && !given && a.name ? "organization" : "person",
		orcid,
		affiliation,
	};
}

function yearFromDate(s: string | undefined): string | undefined {
	if (!s) return undefined;
	const m = /^(\d{4})/.exec(s);
	return m ? m[1] : undefined;
}

export interface ApplyResult {
	state: SeedFormState;
	usedCff: boolean;
	usedCodemeta: boolean;
}

export function applyFetchedMetadata(opts: {
	cff?: unknown;
	codemeta?: unknown;
	repoUrl: string;
}): ApplyResult {
	const base = initialSeedFormState();
	base.repository = opts.repoUrl;

	const cff = opts.cff as CffShape | undefined;
	const codemeta = opts.codemeta as CodemetaShape | undefined;

	const name = cff?.title ?? codemeta?.name ?? "";
	if (name) {
		base.canonicalName = name;
		base.id = slugify(name);
	}

	base.description = cff?.abstract ?? codemeta?.description ?? "";

	base.homepage = cff?.url ?? codemeta?.url ?? opts.repoUrl;
	base.repository =
		cff?.["repository-code"] ?? codemeta?.codeRepository ?? opts.repoUrl;

	const cffLicense = cff?.license;
	const codemetaLicense = codemeta?.license
		? stripSpdxLicensePrefix(codemeta.license)
		: undefined;
	base.license = cffLicense ?? codemetaLicense ?? "";

	if (codemeta?.programmingLanguage) {
		base.ecosystem = ecosystemFromLanguage(codemeta.programmingLanguage);
	}

	let authors: SeedAuthor[] = [];
	if (cff?.authors?.length) {
		authors = cff.authors.map(cffAuthorToSeed);
	} else if (codemeta?.author) {
		const list = Array.isArray(codemeta.author)
			? codemeta.author
			: [codemeta.author];
		authors = list.map(codemetaAuthorToSeed);
	}
	if (authors.length === 0) authors = [emptyAuthor()];
	base.authors = authors;

	// Citation fields — software-shaped only.
	const pc = cff?.["preferred-citation"];
	const year =
		(pc?.year !== undefined ? String(pc.year) : undefined) ??
		yearFromDate(cff?.["date-released"]) ??
		yearFromDate(codemeta?.datePublished) ??
		yearFromDate(codemeta?.dateCreated);
	if (year) base.year = year;

	base.version = cff?.version ?? codemeta?.version ?? "";

	const doi =
		(pc?.doi ? stripDoiPrefix(pc.doi) : undefined) ??
		(cff?.doi ? stripDoiPrefix(cff.doi) : undefined) ??
		(typeof codemeta?.identifier === "string"
			? stripDoiPrefix(codemeta.identifier)
			: undefined);
	if (doi) base.doi = doi;

	if (!doi) {
		// Need a URL fallback.
		base.citationUrl = pc?.url ?? base.homepage;
	}

	if (pc?.publisher) base.publisher = pc.publisher;

	return {
		state: base,
		usedCff: Boolean(cff),
		usedCodemeta: Boolean(codemeta),
	};
}
