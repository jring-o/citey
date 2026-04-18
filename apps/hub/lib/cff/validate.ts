import { KNOWN_LICENSES, verifyOrcidChecksum } from "@citey/citation-model";
import type { AuthorFormState, CffFormState } from "./state";

export interface ValidationError {
	field: string;
	message: string;
}

export type ValidationResult =
	| { ok: true }
	| { ok: false; errors: ValidationError[] };

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

function isRealDate(dateStr: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
	if (!match) return false;
	const [, yearStr, monthStr, dayStr] = match;
	const year = Number(yearStr);
	const month = Number(monthStr);
	const day = Number(dayStr);
	if (month < 1 || month > 12) return false;
	if (day < 1) return false;
	const d = new Date(year, month - 1, day);
	return (
		d.getFullYear() === year &&
		d.getMonth() === month - 1 &&
		d.getDate() === day
	);
}

function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function validateAuthor(
	a: AuthorFormState,
	prefix: string,
): ValidationError[] {
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

export function validate(state: CffFormState): ValidationResult {
	const errors: ValidationError[] = [];

	if (!state.title.trim()) {
		errors.push({ field: "title", message: "Title is required" });
	}

	if (state.dateReleased.trim()) {
		if (!isRealDate(state.dateReleased.trim())) {
			errors.push({
				field: "dateReleased",
				message: `"${state.dateReleased.trim()}" is not a valid date (expected YYYY-MM-DD)`,
			});
		}
	}

	if (state.license.trim() && !KNOWN_LICENSES.has(state.license.trim())) {
		errors.push({
			field: "license",
			message: `"${state.license.trim()}" is not a recognized SPDX license identifier`,
		});
	}

	if (state.url.trim() && !isValidUrl(state.url.trim())) {
		errors.push({ field: "url", message: "URL is not valid" });
	}

	if (state.repositoryCode.trim() && !isValidUrl(state.repositoryCode.trim())) {
		errors.push({
			field: "repositoryCode",
			message: "Repository URL is not valid",
		});
	}

	if (state.authors.length === 0) {
		errors.push({
			field: "authors",
			message: "At least one author is required",
		});
	} else {
		const hasValidAuthor = state.authors.some((a) => a.family.trim() !== "");
		if (!hasValidAuthor) {
			errors.push({
				field: "authors",
				message: "At least one author must have a family name",
			});
		}
		for (let i = 0; i < state.authors.length; i++) {
			const a = state.authors[i]!;
			if (a.family.trim() || a.given.trim()) {
				errors.push(...validateAuthor(a, `authors[${i}]`));
			}
		}
	}

	if (state.doi.trim()) {
		if (!/^10\.\d{4,9}\//.test(state.doi.trim())) {
			errors.push({
				field: "doi",
				message: 'DOI should start with "10.xxxx/"',
			});
		}
	}

	if (errors.length === 0) {
		return { ok: true };
	}
	return { ok: false, errors };
}
