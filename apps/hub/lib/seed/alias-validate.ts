import type { AliasFormState } from "./alias-state";

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ALIAS_RE = /^[a-z0-9][a-z0-9._+\-]{0,63}$/;

export interface ValidationError {
	field: string;
	message: string;
}

export type ValidationResult =
	| { ok: true }
	| { ok: false; errors: ValidationError[] };

/** Slug-ify a canonical name into a kebab-case id. */
export function aliasId(canonicalName: string): string {
	return canonicalName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
}

export function validateAlias(
	state: AliasFormState,
	knownPackageIds: ReadonlySet<string>,
): ValidationResult {
	const errors: ValidationError[] = [];

	const name = state.canonicalName.trim();
	if (!name) {
		errors.push({
			field: "canonicalName",
			message: "Alias name is required (e.g. astropy.cosmology)",
		});
	} else if (name.length > 80) {
		errors.push({
			field: "canonicalName",
			message: "Alias name must be 80 characters or fewer",
		});
	} else if (!ALIAS_RE.test(name.toLowerCase())) {
		errors.push({
			field: "canonicalName",
			message:
				"Alias name (lowercased) must match ^[a-z0-9][a-z0-9._+-]{0,63}$",
		});
	}

	const id = aliasId(name);
	if (name && !id) {
		errors.push({
			field: "canonicalName",
			message: "Alias name must contain at least one alphanumeric character",
		});
	} else if (id && !ID_RE.test(id)) {
		errors.push({
			field: "canonicalName",
			message: "Derived id is invalid; pick a different alias name",
		});
	}

	if (!state.parentId.trim()) {
		errors.push({
			field: "parentId",
			message: "Pick the parent package this alias should redirect to",
		});
	} else if (!knownPackageIds.has(state.parentId.trim())) {
		errors.push({
			field: "parentId",
			message: `"${state.parentId.trim()}" is not in the database`,
		});
	} else if (state.parentId.trim() === id) {
		errors.push({
			field: "parentId",
			message: "Parent must be a different package",
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

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
