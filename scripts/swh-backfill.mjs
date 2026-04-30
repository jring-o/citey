#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Software Heritage SWHID backfill
//
// Walks data/seed/**/*.yaml looking for entries that the hub marked as
// awaiting SWH archival (`swhPending: true`). For each one:
//
//   - If a snapshot is now available at SWH, write `swhid: swh:1:snp:<hex>`
//     and remove `swhPending` + `swhSubmittedAt`.
//   - If 72 hours have elapsed since submission, write `swhFailed: true`
//     and remove `swhPending` + `swhSubmittedAt` to stop polling.
//   - Otherwise leave the entry untouched and try again next run.
//
// Modifies YAML files in place; the surrounding GitHub Actions workflow
// opens a PR with the diff. Idempotent: if no entries change, nothing is
// written and the workflow's PR action skips.
// ---------------------------------------------------------------------------

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { parse as parseYaml, parseDocument as parseYamlDoc } from "yaml";

const SWH_BASE = "https://archive.softwareheritage.org/api/1";
const FAILURE_DEADLINE_MS = 72 * 60 * 60 * 1000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SEED_GLOB = resolve(REPO_ROOT, "data", "seed", "**", "*.yaml")
	.replace(/\\/g, "/");

async function fetchVisitLatest(repoUrl) {
	const url = `${SWH_BASE}/origin/${encodeURIComponent(repoUrl)}/visit/latest/`;
	let res;
	try {
		res = await fetch(url);
	} catch (err) {
		console.warn(`  ! visit/latest network error: ${err.message}`);
		return null;
	}
	if (!res.ok) {
		// 404 = no archived visit yet; benign while pending.
		if (res.status !== 404) {
			console.warn(`  ! visit/latest ${res.status} for ${repoUrl}`);
		}
		return null;
	}
	const data = await res.json();
	if (data.status !== "full" && data.status !== "partial") return null;
	if (typeof data.snapshot !== "string" || data.snapshot.length === 0) {
		return null;
	}
	return `swh:1:snp:${data.snapshot}`;
}

function elapsedMs(iso) {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
	return Date.now() - t;
}

/**
 * Mutate a parsed yaml `Document` in place to record success or failure.
 * Returns "success" | "failed" | "skip".
 */
async function processEntry(file, doc) {
	const json = doc.toJS();
	if (json.swhPending !== true) return "skip";

	const repo = json.repository;
	const submittedAt = json.swhSubmittedAt;

	if (typeof repo !== "string" || repo === "") {
		console.warn(`  ! ${file}: swhPending without repository — failing`);
		doc.set("swhFailed", true);
		doc.delete("swhPending");
		doc.delete("swhSubmittedAt");
		return "failed";
	}
	if (typeof submittedAt !== "string") {
		console.warn(`  ! ${file}: swhPending without swhSubmittedAt — failing`);
		doc.set("swhFailed", true);
		doc.delete("swhPending");
		doc.delete("swhSubmittedAt");
		return "failed";
	}

	const swhid = await fetchVisitLatest(repo);
	if (swhid !== null) {
		doc.set("swhid", swhid);
		doc.delete("swhPending");
		doc.delete("swhSubmittedAt");
		return "success";
	}

	if (elapsedMs(submittedAt) >= FAILURE_DEADLINE_MS) {
		doc.set("swhFailed", true);
		doc.delete("swhPending");
		doc.delete("swhSubmittedAt");
		return "failed";
	}

	return "skip";
}

async function main() {
	const files = await glob(SEED_GLOB);
	const candidates = [];
	for (const file of files) {
		const base = file.replace(/\\/g, "/").split("/").pop();
		if (!base || base.startsWith("_")) continue;
		const raw = await readFile(file, "utf-8");
		const json = parseYaml(raw);
		if (json && json.swhPending === true) {
			candidates.push({ file, raw });
		}
	}

	if (candidates.length === 0) {
		console.log("No swhPending entries — nothing to do.");
		return;
	}

	console.log(`Found ${candidates.length} swhPending entr(y/ies).`);

	let successes = 0;
	let failures = 0;
	for (const { file, raw } of candidates) {
		console.log(`Processing ${file}`);
		const doc = parseYamlDoc(raw);
		const outcome = await processEntry(file, doc);
		if (outcome === "skip") continue;

		const updated = doc.toString({ lineWidth: 0, singleQuote: false })
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n");
		await writeFile(file, updated, "utf-8");

		if (outcome === "success") {
			successes += 1;
			console.log(`  ✓ wrote swhid for ${file}`);
		} else {
			failures += 1;
			console.log(`  ✗ marked swhFailed for ${file} (72h deadline)`);
		}
	}

	console.log(
		`\nSummary: ${successes} swhid written, ${failures} marked failed, ${candidates.length - successes - failures} still pending.`,
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
