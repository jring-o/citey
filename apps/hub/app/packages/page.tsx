"use client";

import { useEffect, useMemo, useState } from "react";
import type { Package } from "@citey/citation-model";
import { Button } from "../_ui/primitives";
import { AddPackageModal } from "./_components/AddPackageModal";

interface DbArtifact {
	schemaVersion: number;
	builtAt: string;
	dbVersion: string;
	packageCount: number;
	packages: Package[];
	aliasIndex: Record<string, string[]>;
}

type SortField =
	| "canonicalName"
	| "ecosystem"
	| "id"
	| "description"
	| "author";

type SortDir = "asc" | "desc";

function primaryAuthor(pkg: Package): string {
	const a = pkg.citation?.authors[0];
	if (!a) return "\u2014";
	return `${a.given} ${a.family}`.trim() || "\u2014";
}

function primaryDoi(pkg: Package): string | undefined {
	return pkg.citation?.doi ?? pkg.dois?.[0];
}

function sortKey(pkg: Package, field: SortField): string {
	switch (field) {
		case "canonicalName":
			return pkg.canonicalName.toLowerCase();
		case "ecosystem":
			return pkg.ecosystem;
		case "id":
			return pkg.id;
		case "description":
			return pkg.description.toLowerCase();
		case "author":
			return primaryAuthor(pkg).toLowerCase();
	}
}

function sortIndicator(
	field: SortField,
	current: SortField,
	dir: SortDir,
): string {
	if (field !== current) return "";
	return dir === "asc" ? " \u25B2" : " \u25BC";
}

export default function Packages() {
	const [packages, setPackages] = useState<Package[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [sortField, setSortField] = useState<SortField>("canonicalName");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [addOpen, setAddOpen] = useState(false);

	useEffect(() => {
		fetch("/db.json")
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<DbArtifact>;
			})
			.then((db) => setPackages(db.packages))
			.catch((e: Error) => setError(e.message))
			.finally(() => setLoading(false));
	}, []);

	const handleSort = (field: SortField) => {
		if (field === sortField) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("asc");
		}
	};

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();
		if (!q) return packages;
		return packages.filter(
			(p) =>
				p.canonicalName.toLowerCase().includes(q) ||
				p.id.toLowerCase().includes(q) ||
				p.ecosystem.toLowerCase().includes(q),
		);
	}, [packages, search]);

	const sorted = useMemo(() => {
		const list = [...filtered];
		list.sort((a, b) => {
			const cmp = sortKey(a, sortField).localeCompare(sortKey(b, sortField));
			return sortDir === "asc" ? cmp : -cmp;
		});
		return list;
	}, [filtered, sortField, sortDir]);

	const header = (
		<>
			<div className="mb-2 flex flex-wrap items-start justify-between gap-4">
				<h1 className="text-3xl font-bold text-text">Package Browser</h1>
				<Button variant="primary" onClick={() => setAddOpen(true)}>
					+ Add package
				</Button>
			</div>
			<AddPackageModal open={addOpen} onClose={() => setAddOpen(false)} />
		</>
	);

	if (loading) {
		return (
			<main className="mx-auto max-w-7xl px-6 py-10">
				{header}
				<p className="py-16 text-center text-text-muted">
					Loading packages&hellip;
				</p>
			</main>
		);
	}

	if (error) {
		return (
			<main className="mx-auto max-w-7xl px-6 py-10">
				{header}
				<p className="py-16 text-center text-red-600">
					Failed to load database: {error}
				</p>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-7xl px-6 py-10">
			{header}
			<p className="mb-6 max-w-prose text-lg text-text-muted">
				Browse the bundled database of software packages and their citation
				metadata. Click column headers to sort.
			</p>

			<div className="mb-6 flex flex-wrap items-center gap-4">
				<div className="min-w-[16rem] max-w-[24rem] flex-1">
					<input
						id="pkg-search"
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by name, id, or ecosystem…"
						aria-label="Search packages"
						className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
					/>
				</div>
				<span className="ml-auto text-sm text-text-muted">
					{sorted.length} of {packages.length} packages
				</span>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border">
				<table className="w-full border-collapse text-sm leading-normal">
					<thead>
						<tr>
							{(
								[
									["id", "ID"],
									["canonicalName", "Name"],
									["ecosystem", "Ecosystem"],
									["description", "Description"],
									["author", "Primary Author"],
								] as const
							).map(([field, label]) => (
								<th
									key={field}
									onClick={() => handleSort(field)}
									className="cursor-pointer select-none whitespace-nowrap border-b-2 border-border bg-surface px-4 py-3 text-left font-semibold text-text"
								>
									{label}
									{sortIndicator(field, sortField, sortDir)}
								</th>
							))}
							<th className="whitespace-nowrap border-b-2 border-border bg-surface px-4 py-3 text-left font-semibold text-text">
								DOI
							</th>
						</tr>
					</thead>
					<tbody>
						{sorted.map((pkg) => {
							const doi = primaryDoi(pkg);
							return (
								<tr key={pkg.id}>
									<td className="border-b border-border px-4 py-2.5 align-top text-text-muted">
										<code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-[0.875em]">
											{pkg.id}
										</code>
									</td>
									<td className="whitespace-nowrap border-b border-border px-4 py-2.5 align-top font-semibold text-text">
										{pkg.canonicalName}
									</td>
									<td className="border-b border-border px-4 py-2.5 align-top text-text-muted">
										<span className="inline-block rounded-full border border-border bg-code-bg px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
											{pkg.ecosystem}
										</span>
									</td>
									<td
										className="max-w-[28rem] overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-4 py-2.5 align-top text-text-muted"
										title={pkg.description}
									>
										{pkg.description}
									</td>
									<td className="border-b border-border px-4 py-2.5 align-top text-text-muted">
										{primaryAuthor(pkg)}
									</td>
									<td className="border-b border-border px-4 py-2.5 align-top text-text-muted">
										{doi ? (
											<a
												href={`https://doi.org/${doi}`}
												target="_blank"
												rel="noopener"
												className="text-[0.8125rem] text-accent no-underline hover:underline"
											>
												{doi}
											</a>
										) : (
											"\u2014"
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</main>
	);
}
