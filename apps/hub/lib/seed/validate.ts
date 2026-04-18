import { KNOWN_LICENSES, verifyOrcidChecksum } from "@citey/citation-model";
import type { SeedAuthor, SeedFormState } from "./state";

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
const DOI_RE = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

export interface ValidationError {
	field: string;
	message: string;
}

export type ValidationResult =
	| { ok: true }
	| { ok: false; errors: ValidationError[] };

function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function validateAuthor(a: SeedAuthor, prefix: string): ValidationError[] {
	const errors: ValidationError[] = [];
	if (!a.family.trim()) {
		errors.push({
			field: `${prefix}.family`,
			message: "Family name is required",
		});
	}
	if (a.kind === "person" && !a.given.trim()) {
		errors.push({
			field: `${prefix}.given`,
			message: "Given name is required for persons",
		});
	}
	if (a.orcid.trim()) {
		if (!ORCID_RE.test(a.orcid.trim())) {
			errors.push({
				field: `${prefix}.orcid`,
				message: "ORCID must be in 0000-0000-0000-000X format",
			});
		} else if (!verifyOrcidChecksum(a.orcid.trim())) {
			errors.push({
				field: `${prefix}.orcid`,
				message: "ORCID checksum failed",
			});
		}
	}
	return errors;
}

export function validateSeed(state: SeedFormState): ValidationResult {
	const errors: ValidationError[] = [];

	if (!state.id.trim()) {
		errors.push({ field: "id", message: "ID is required" });
	} else if (!ID_RE.test(state.id.trim())) {
		errors.push({
			field: "id",
			message: "ID must be lowercase kebab-case (e.g. scikit-learn)",
		});
	} else if (state.id.trim().length > 64) {
		errors.push({ field: "id", message: "ID must be 64 characters or fewer" });
	}

	const name = state.canonicalName.trim();
	if (!name) {
		errors.push({ field: "canonicalName", message: "Name is required" });
	} else if (name.length > 80) {
		errors.push({
			field: "canonicalName",
			message: "Name must be 80 characters or fewer",
		});
	}

	const desc = state.description.trim();
	if (!desc) {
		errors.push({ field: "description", message: "Description is required" });
	} else if (desc.length > 280) {
		errors.push({
			field: "description",
			message: "Description must be 280 characters or fewer",
		});
	}

	if (!state.homepage.trim()) {
		errors.push({ field: "homepage", message: "Homepage URL is required" });
	} else if (!isValidUrl(state.homepage.trim())) {
		errors.push({ field: "homepage", message: "Homepage is not a valid URL" });
	}

	if (state.repository.trim() && !isValidUrl(state.repository.trim())) {
		errors.push({
			field: "repository",
			message: "Repository is not a valid URL",
		});
	}

	if (state.license.trim() && !KNOWN_LICENSES.has(state.license.trim())) {
		errors.push({
			field: "license",
			message: `"${state.license.trim()}" is not a recognized SPDX identifier`,
		});
	}

	if (state.authors.length === 0) {
		errors.push({
			field: "authors",
			message: "At least one author is required",
		});
	} else {
		for (let i = 0; i < state.authors.length; i++) {
			errors.push(...validateAuthor(state.authors[i]!, `authors[${i}]`));
		}
	}

	const year = state.year.trim();
	if (!year) {
		errors.push({ field: "year", message: "Year is required" });
	} else if (!/^\d{4}$/.test(year)) {
		errors.push({ field: "year", message: "Year must be 4 digits" });
	} else {
		const n = Number(year);
		const max = new Date().getFullYear() + 1;
		if (n < 1970 || n > max) {
			errors.push({
				field: "year",
				message: `Year must be between 1970 and ${max}`,
			});
		}
	}

	if (state.doi.trim() && !DOI_RE.test(state.doi.trim())) {
		errors.push({
			field: "doi",
			message: "DOI must look like 10.xxxx/yyyyy",
		});
	}

	if (state.citationUrl.trim() && !isValidUrl(state.citationUrl.trim())) {
		errors.push({
			field: "citationUrl",
			message: "Citation URL is not valid",
		});
	}

	if (!state.doi.trim() && !state.citationUrl.trim()) {
		errors.push({
			field: "doi",
			message: "Either DOI or citation URL is required (citation needs a resolvable pointer)",
		});
	}

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
