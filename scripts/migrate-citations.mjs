#!/usr/bin/env node
// One-shot migration: rewrite every seed YAML from the legacy
// preferredCitation/BibTeXBlock shape to the new flat SoftwareCitation
// model. Idempotent — re-running is a no-op once converted.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse: parseYaml, stringify: stringifyYaml } = require(
	resolve(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'db-build', 'node_modules', 'yaml'),
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SEED_ROOT = process.env.SEED_ROOT
	? resolve(process.env.SEED_ROOT)
	: join(REPO_ROOT, 'data', 'seed');

async function walk(dir) {
	const out = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const e of entries) {
		const p = join(dir, e.name);
		if (e.isDirectory()) out.push(...(await walk(p)));
		else if (e.isFile() && p.endsWith('.yaml') && !p.endsWith('_template.yaml'))
			out.push(p);
	}
	return out;
}

const seedFiles = await walk(SEED_ROOT);

let migrated = 0;
let skipped = 0;
let errors = 0;

for (const file of seedFiles) {
	const text = await readFile(file, 'utf8');
	let pkg;
	try {
		pkg = parseYaml(text);
	} catch (err) {
		console.error(`PARSE FAIL ${file}: ${err.message}`);
		errors++;
		continue;
	}

	if (pkg && pkg.citation) {
		skipped++;
		continue;
	}

	if (pkg.citeAs) {
		// Alias entry — strip preferredCitation/cff/authors if present, no citation needed.
		delete pkg.preferredCitation;
		delete pkg.cff;
		delete pkg.authors;
	} else {
		const oldPC = pkg.preferredCitation ?? {};
		const oldFields = oldPC.fields ?? {};

		const authors = Array.isArray(pkg.authors) ? pkg.authors : [];
		if (authors.length === 0) {
			console.error(`MISSING AUTHORS ${file} — needs manual edit`);
			errors++;
			continue;
		}

		const year = oldFields.year;
		if (!year) {
			console.error(`MISSING YEAR ${file} — needs manual edit`);
			errors++;
			continue;
		}

		const doi =
			oldFields.doi ??
			(Array.isArray(pkg.dois) && pkg.dois.length > 0 ? pkg.dois[0] : undefined);

		// URL: prefer the citation URL if it's a non-DOI URL, else homepage,
		// else repository. We don't want to duplicate the DOI as a URL.
		let url;
		if (oldFields.url && !/^https?:\/\/(?:dx\.)?doi\.org\//i.test(oldFields.url)) {
			url = oldFields.url;
		} else if (pkg.homepage) {
			url = pkg.homepage;
		} else if (pkg.repository) {
			url = pkg.repository;
		}

		const citation = {
			title: pkg.canonicalName,
			authors,
			year: String(year),
		};
		if (pkg.preferredVersion) citation.version = pkg.preferredVersion;
		if (doi) citation.doi = doi;
		if (url && !doi) citation.url = url; // url is fallback when no doi
		if (oldFields.publisher) citation.publisher = oldFields.publisher;

		// If we have neither doi nor url, fall back to homepage as url.
		if (!citation.doi && !citation.url) {
			if (pkg.homepage) citation.url = pkg.homepage;
			else if (pkg.repository) citation.url = pkg.repository;
		}

		pkg.citation = citation;
		delete pkg.preferredCitation;
		delete pkg.cff;
		delete pkg.authors;
	}

	const out = stringifyYaml(pkg, {
		indent: 2,
		lineWidth: 0,
		singleQuote: false,
	});

	await writeFile(file, out, 'utf8');
	migrated++;
}

console.log(`Migrated: ${migrated}`);
console.log(`Skipped (already migrated): ${skipped}`);
console.log(`Errors: ${errors}`);
process.exit(errors > 0 ? 1 : 0);
