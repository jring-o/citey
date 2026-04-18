import type {
	AuthorFormState,
	CodemetaFormState,
	FundingReferenceFormState,
} from "./state";

const CODEMETA_CONTEXT = "https://doi.org/10.5063/schema/codemeta-2.0";
const CODEMETA_TYPE = "SoftwareSourceCode";

function optional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

function setOptional(
	obj: Record<string, unknown>,
	key: string,
	value: string,
): void {
	const v = optional(value);
	if (v !== undefined) obj[key] = v;
}

function toAuthorObj(a: AuthorFormState): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	obj["@type"] = "Person";
	if (a.family.trim()) obj["familyName"] = a.family.trim();
	if (a.given.trim()) obj["givenName"] = a.given.trim();
	if (a.email.trim()) obj["email"] = a.email.trim();
	if (a.affiliation.trim()) {
		obj["affiliation"] = {
			"@type": "Organization",
			name: a.affiliation.trim(),
		};
	}
	if (a.orcid.trim()) obj["@id"] = `https://orcid.org/${a.orcid.trim()}`;
	return obj;
}

function toFundingRefObj(
	ref: FundingReferenceFormState,
): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	obj["@type"] = "Grant";
	if (ref.funderName.trim()) {
		obj["funder"] = {
			"@type": "Organization",
			name: ref.funderName.trim(),
		};
	}
	if (ref.awardNumber.trim()) obj["identifier"] = ref.awardNumber.trim();
	if (ref.awardTitle.trim()) obj["name"] = ref.awardTitle.trim();
	return obj;
}

function parseCommaSeparated(raw: string): string[] | undefined {
	const parts = raw
		.split(",")
		.map((k) => k.trim())
		.filter((k) => k.length > 0);
	return parts.length > 0 ? parts : undefined;
}

export function toCodemetaJson(state: CodemetaFormState): string {
	const doc: Record<string, unknown> = {};

	doc["@context"] = CODEMETA_CONTEXT;
	doc["@type"] = CODEMETA_TYPE;

	setOptional(doc, "name", state.name);
	setOptional(doc, "description", state.description);
	setOptional(doc, "codeRepository", state.codeRepository);
	setOptional(doc, "url", state.url);
	setOptional(doc, "dateCreated", state.dateCreated);
	setOptional(doc, "dateModified", state.dateModified);

	if (state.license.trim()) {
		doc["license"] = `https://spdx.org/licenses/${state.license.trim()}`;
	}

	setOptional(doc, "version", state.version);

	doc["author"] = state.authors.map(toAuthorObj);

	const langs = parseCommaSeparated(state.programmingLanguage);
	if (langs !== undefined) doc["programmingLanguage"] = langs;

	const kw = parseCommaSeparated(state.keywords);
	if (kw !== undefined) doc["keywords"] = kw;

	setOptional(doc, "identifier", state.identifier);

	setOptional(doc, "applicationCategory", state.applicationCategory);

	const os = parseCommaSeparated(state.operatingSystem);
	if (os !== undefined) doc["operatingSystem"] = os;

	const reqs = parseCommaSeparated(state.softwareRequirements);
	if (reqs !== undefined) doc["softwareRequirements"] = reqs;

	const fundingRefs = state.fundingReferences.filter(
		(ref) =>
			ref.funderName.trim() !== "" || ref.awardNumber.trim() !== "",
	);
	if (fundingRefs.length > 0) {
		doc["funding"] = fundingRefs.map(toFundingRefObj);
	} else {
		setOptional(doc, "funding", state.funding);
	}

	setOptional(doc, "developmentStatus", state.developmentStatus);
	setOptional(doc, "referencePublication", state.referencePublication);

	const raw = JSON.stringify(doc, null, 2);
	return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
