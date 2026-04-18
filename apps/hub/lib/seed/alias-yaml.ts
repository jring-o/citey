import { stringify } from "yaml";
import type { AliasFormState } from "./alias-state";
import { aliasId } from "./alias-validate";

function todayIso(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function toAliasYaml(state: AliasFormState): string {
	const today = todayIso();
	const name = state.canonicalName.trim();
	const id = aliasId(name);
	const lowerName = name.toLowerCase();

	// Aliases must include the lowercased canonicalName. Add the id too if
	// it differs (kebab-case slug of the dotted name is a useful alternate
	// search key).
	const aliases = [lowerName];
	if (id !== lowerName) aliases.push(id);

	const doc: Record<string, unknown> = {};
	doc["id"] = id;
	doc["canonicalName"] = name;
	doc["aliases"] = aliases;
	doc["ecosystem"] = state.ecosystem;
	doc["description"] = state.description.trim();
	doc["provenance"] = {
		source: "hand-curated",
		curator: state.contributorName.trim() || "community-submission",
		dateAdded: today,
		lastReviewed: today,
	};
	doc["versionPolicy"] = "unversioned";
	doc["citeAs"] = state.parentId.trim();

	const raw = stringify(doc, {
		indent: 2,
		lineWidth: 0,
		singleQuote: false,
	});
	return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
