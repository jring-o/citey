import { stringify } from "yaml";
import type {
	AuthorFormState,
	CffFormState,
	IdentifierFormState,
} from "./state";

function optional(value: string): string | undefined {
	return value.trim() === "" ? undefined : value.trim();
}

function setOptional(
	obj: Record<string, unknown>,
	key: string,
	value: string,
): void {
	const v = optional(value);
	if (v !== undefined) obj[key] = v;
}

function toAuthorObj(a: AuthorFormState): Record<string, string> {
	const obj: Record<string, string> = {};
	obj["family-names"] = a.family;
	obj["given-names"] = a.given;
	if (a.orcid.trim()) obj["orcid"] = `https://orcid.org/${a.orcid.trim()}`;
	if (a.affiliation.trim()) obj["affiliation"] = a.affiliation.trim();
	return obj;
}

function toIdentifierObj(id: IdentifierFormState): Record<string, string> {
	const obj: Record<string, string> = {};
	obj["type"] = id.type;
	obj["value"] = id.value;
	if (id.description.trim()) obj["description"] = id.description.trim();
	return obj;
}

function parseKeywords(raw: string): string[] | undefined {
	const parts = raw
		.split(",")
		.map((k) => k.trim())
		.filter((k) => k.length > 0);
	return parts.length > 0 ? parts : undefined;
}

export function toCffYaml(state: CffFormState): string {
	const doc: Record<string, unknown> = {};

	doc["cff-version"] = "1.2.0";
	doc["message"] =
		state.message ||
		"If you use this software, please cite it using the metadata from this file.";
	doc["title"] = state.title || "";

	if (state.type !== "software") {
		doc["type"] = state.type;
	}

	setOptional(doc, "version", state.version);
	setOptional(doc, "date-released", state.dateReleased);
	setOptional(doc, "doi", state.doi);
	setOptional(doc, "url", state.url);
	setOptional(doc, "repository-code", state.repositoryCode);
	setOptional(doc, "license", state.license);

	const kw = parseKeywords(state.keywords);
	if (kw !== undefined) doc["keywords"] = kw;

	setOptional(doc, "abstract", state.abstract);

	doc["authors"] = state.authors.map(toAuthorObj);

	if (state.identifiers.length > 0) {
		const filtered = state.identifiers.filter((id) => id.value.trim() !== "");
		if (filtered.length > 0) {
			doc["identifiers"] = filtered.map(toIdentifierObj);
		}
	}

	if (state.preferredCitation.title.trim()) {
		const pc = state.preferredCitation;
		const pcObj: Record<string, unknown> = {};
		pcObj["type"] = pc.type || "article";
		pcObj["title"] = pc.title;
		pcObj["authors"] = pc.authors.map(toAuthorObj);
		setOptional(pcObj, "doi", pc.doi);
		setOptional(pcObj, "journal", pc.journal);
		setOptional(pcObj, "volume", pc.volume);
		setOptional(pcObj, "issue", pc.issue);
		const pcYear = optional(pc.year);
		if (pcYear !== undefined) pcObj["year"] = Number(pcYear);
		setOptional(pcObj, "start", pc.start);
		setOptional(pcObj, "end", pc.end);
		setOptional(pcObj, "url", pc.url);
		doc["preferred-citation"] = pcObj;
	}

	const raw = stringify(doc, {
		indent: 2,
		lineWidth: 0,
		singleQuote: false,
	});

	return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
