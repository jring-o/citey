import { KNOWN_LICENSES, verifyOrcidChecksum } from "@citey/citation-model";
import type { AuthorFormState, CodemetaFormState } from "./state";

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
	if (!a.given.trim()) {
		errors.push({
			field: `${prefix}.given`,
			message: "Given name is required",
		});
	}
	const orcid = a.orcid.trim();
	if (orcid) {
		if (!ORCID_RE.test(orcid)) {
			errors.push({
				field: `${prefix}.orcid`,
				message: "ORCID must be in 0000-0000-0000-000X format",
			});
		} else if (!verifyOrcidChecksum(orcid)) {
			errors.push({
				field: `${prefix}.orcid`,
				message: "ORCID checksum failed",
			});
		}
	}
	const email = a.email.trim();
	if (email) {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.push({
				field: `${prefix}.email`,
				message: "Email format is invalid",
			});
		}
	}

	return errors;
}

export function validate(state: CodemetaFormState): ValidationResult {
	const errors: ValidationError[] = [];

	if (!state.name.trim()) {
		errors.push({ field: "name", message: "Name is required" });
	}

	const dateCreated = state.dateCreated.trim();
	if (dateCreated && !isRealDate(dateCreated)) {
		errors.push({
			field: "dateCreated",
			message: `"${dateCreated}" is not a valid date (expected YYYY-MM-DD)`,
		});
	}

	const dateModified = state.dateModified.trim();
	if (dateModified && !isRealDate(dateModified)) {
		errors.push({
			field: "dateModified",
			message: `"${dateModified}" is not a valid date (expected YYYY-MM-DD)`,
		});
	}

	const license = state.license.trim();
	if (license && !KNOWN_LICENSES.has(license)) {
		errors.push({
			field: "license",
			message: `"${license}" is not a recognized SPDX license identifier`,
		});
	}

	const url = state.url.trim();
	if (url && !isValidUrl(url)) {
		errors.push({ field: "url", message: "URL is not valid" });
	}

	const codeRepository = state.codeRepository.trim();
	if (codeRepository && !isValidUrl(codeRepository)) {
		errors.push({
			field: "codeRepository",
			message: "Code repository URL is not valid",
		});
	}

	const identifier = state.identifier.trim();
	if (identifier && !isValidUrl(identifier)) {
		errors.push({
			field: "identifier",
			message:
				"Identifier must be a valid URL (e.g. https://doi.org/10.xxxx/...)",
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

	if (errors.length === 0) {
		return { ok: true };
	}
	return { ok: false, errors };
}
