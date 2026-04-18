"use client";

import { useEffect, useMemo, useState } from "react";
import type { Package } from "@citey/citation-model";
import {
	Banner,
	Button,
	Field,
	Select,
	TextArea,
	TextInput,
} from "../../_ui/primitives";
import {
	useAliasForm,
	type AliasFormState,
} from "@/lib/seed/alias-state";
import { aliasId, validateAlias } from "@/lib/seed/alias-validate";
import { toAliasYaml } from "@/lib/seed/alias-yaml";
import { buildGithubNewFileUrl, MAX_YAML_BYTES } from "@/lib/seed/github-url";

interface Props {
	open: boolean;
	onClose: () => void;
	packages: Package[];
}

export function AddAliasModal({ open, onClose, packages }: Props) {
	const { state, setField, reset } = useAliasForm();
	const [submitted, setSubmitted] = useState(false);
	const [parentSearch, setParentSearch] = useState("");

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [open, onClose]);

	// Only allow primary packages (those with a citation, not aliases themselves)
	// to be picked as parents.
	const eligibleParents = useMemo(
		() => packages.filter((p) => p.citation !== undefined),
		[packages],
	);

	const knownIds = useMemo(
		() => new Set(eligibleParents.map((p) => p.id)),
		[eligibleParents],
	);

	const filteredParents = useMemo(() => {
		const q = parentSearch.toLowerCase().trim();
		if (!q) return eligibleParents.slice(0, 50);
		return eligibleParents
			.filter(
				(p) =>
					p.id.toLowerCase().includes(q) ||
					p.canonicalName.toLowerCase().includes(q),
			)
			.slice(0, 50);
	}, [eligibleParents, parentSearch]);

	const yaml = useMemo(() => toAliasYaml(state), [state]);
	const yamlBytes = useMemo(
		() => new TextEncoder().encode(yaml).length,
		[yaml],
	);
	const tooLong = yamlBytes > MAX_YAML_BYTES;
	const validation = useMemo(
		() => validateAlias(state, knownIds),
		[state, knownIds],
	);
	const errorMap = useMemo(() => {
		const map = new Map<string, string>();
		if (!validation.ok) {
			for (const e of validation.errors) map.set(e.field, e.message);
		}
		return map;
	}, [validation]);

	const canSubmit = validation.ok && !tooLong;

	const handleSubmit = () => {
		if (!canSubmit) return;
		const url = buildGithubNewFileUrl({
			ecosystem: state.ecosystem,
			id: aliasId(state.canonicalName),
			yaml,
		});
		window.open(url, "_blank", "noopener,noreferrer");
		setSubmitted(true);
	};

	const handleClose = () => {
		setSubmitted(false);
		setParentSearch("");
		reset();
		onClose();
	};

	if (!open) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="add-alias-title"
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
			onClick={handleClose}
		>
			<div
				className="w-full max-w-2xl rounded-xl border border-border bg-bg shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<header className="flex items-center justify-between border-b border-border px-6 py-4">
					<h2
						id="add-alias-title"
						className="text-xl font-semibold text-text"
					>
						Add an alias
					</h2>
					<Button variant="ghost" onClick={handleClose} aria-label="Close">
						✕
					</Button>
				</header>

				<div className="flex flex-col gap-5 p-6">
					{submitted ? (
						<SuccessPanel onClose={handleClose} />
					) : (
						<AliasForm
							state={state}
							setField={setField}
							errorMap={errorMap}
							yaml={yaml}
							yamlBytes={yamlBytes}
							tooLong={tooLong}
							validation={validation}
							canSubmit={canSubmit}
							onSubmit={handleSubmit}
							onCancel={handleClose}
							parentSearch={parentSearch}
							setParentSearch={setParentSearch}
							filteredParents={filteredParents}
							totalEligible={eligibleParents.length}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function SuccessPanel({ onClose }: { onClose: () => void }) {
	return (
		<div className="flex flex-col gap-4">
			<Banner>
				<strong className="font-semibold">Pull request opened on GitHub.</strong>{" "}
				Review the prefilled alias file and click <em>“Commit new file →
				Propose changes”</em>. GitHub will fork the repo for you if needed.
			</Banner>
			<Button variant="primary" onClick={onClose}>
				Done
			</Button>
		</div>
	);
}

interface AliasFormProps {
	state: AliasFormState;
	setField: ReturnType<typeof useAliasForm>["setField"];
	errorMap: Map<string, string>;
	yaml: string;
	yamlBytes: number;
	tooLong: boolean;
	validation: ReturnType<typeof validateAlias>;
	canSubmit: boolean;
	onSubmit: () => void;
	onCancel: () => void;
	parentSearch: string;
	setParentSearch: (s: string) => void;
	filteredParents: Package[];
	totalEligible: number;
}

function AliasForm({
	state,
	setField,
	errorMap,
	yaml,
	yamlBytes,
	tooLong,
	validation,
	canSubmit,
	onSubmit,
	onCancel,
	parentSearch,
	setParentSearch,
	filteredParents,
	totalEligible,
}: AliasFormProps) {
	const derivedId = aliasId(state.canonicalName);
	const selectedParent = filteredParents.find((p) => p.id === state.parentId);

	return (
		<>
			<section className="rounded-lg border border-accent/30 bg-accent/5 p-4">
				<h3 className="m-0 text-sm font-semibold text-text">
					What&rsquo;s an alias?
				</h3>
				<p className="m-0 mt-2 text-sm text-text-muted">
					An alias is a sub-module or alternate name that doesn&rsquo;t carry
					its own citation &mdash; instead, it{" "}
					<strong className="font-semibold text-text">redirects</strong> to
					another package&rsquo;s citation when matched.
				</p>
				<p className="m-0 mt-2 text-sm text-text-muted">
					Examples in the database today:
				</p>
				<ul className="m-0 mt-1 ml-4 list-disc text-sm text-text-muted">
					<li>
						<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
							astropy.cosmology
						</code>{" "}
						&rarr; cite{" "}
						<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
							astropy
						</code>
					</li>
					<li>
						<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
							astropy.io.fits
						</code>{" "}
						&rarr; cite{" "}
						<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
							astropy
						</code>
					</li>
				</ul>
				<p className="m-0 mt-3 text-sm text-text-muted">
					<strong className="font-semibold text-text">
						Use this when:
					</strong>{" "}
					a sub-module of an existing package gets selected by users
					(<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
						numpy.linalg
					</code>
					,{" "}
					<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
						scipy.stats
					</code>
					) and you want it to cite the parent. The sub-module will appear in
					the popup with a &ldquo;matched via&rdquo; breadcrumb.
				</p>
				<p className="m-0 mt-2 text-sm text-text-muted">
					<strong className="font-semibold text-text">
						Don&rsquo;t use this if:
					</strong>{" "}
					your package has its own DOI or its own published citation. Use the
					regular &ldquo;Add package&rdquo; flow instead.
				</p>
			</section>

			<section className="flex flex-col gap-4">
				<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
					Alias details
				</h3>

				<Field
					htmlFor="alias-name"
					label="Alias name (the sub-module / alternate name)"
					error={errorMap.get("canonicalName")}
				>
					<TextInput
						id="alias-name"
						value={state.canonicalName}
						onChange={(e) => setField("canonicalName", e.target.value)}
						placeholder="astropy.cosmology"
						error={errorMap.get("canonicalName")}
					/>
				</Field>
				{derivedId && state.canonicalName.trim() && (
					<p className="-mt-2 text-xs text-text-muted">
						Will be filed as{" "}
						<code className="rounded bg-code-bg px-1 py-0.5 font-mono">
							data/seed/{state.ecosystem}/{derivedId}.yaml
						</code>
					</p>
				)}

				<Field htmlFor="alias-eco" label="Ecosystem">
					<Select
						id="alias-eco"
						value={state.ecosystem}
						onChange={(e) =>
							setField("ecosystem", e.target.value as typeof state.ecosystem)
						}
					>
						<option value="pypi">pypi</option>
						<option value="cran">cran</option>
						<option value="npm">npm</option>
						<option value="julia">julia</option>
						<option value="generic">generic</option>
					</Select>
				</Field>

				<Field
					htmlFor="alias-desc"
					label='Short description (e.g. "Sub-module of Astropy; cite Astropy")'
					error={errorMap.get("description")}
				>
					<TextArea
						id="alias-desc"
						value={state.description}
						onChange={(e) => setField("description", e.target.value)}
						placeholder="Cosmology calculations sub-package of Astropy; cite Astropy."
						rows={2}
						error={errorMap.get("description")}
					/>
				</Field>
			</section>

			<section className="flex flex-col gap-4">
				<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
					Parent package (the one this alias redirects to)
				</h3>

				<Field
					htmlFor="alias-parent-search"
					label={`Search the ${totalEligible} packages in the database`}
					error={errorMap.get("parentId")}
				>
					<TextInput
						id="alias-parent-search"
						value={parentSearch}
						onChange={(e) => setParentSearch(e.target.value)}
						placeholder="Type to filter (e.g. astropy)"
					/>
				</Field>

				<div className="max-h-64 overflow-y-auto rounded-md border border-border bg-surface">
					{filteredParents.length === 0 ? (
						<p className="m-0 px-4 py-3 text-sm text-text-muted">
							No matches.
						</p>
					) : (
						<ul className="m-0 list-none p-0">
							{filteredParents.map((p) => {
								const selected = p.id === state.parentId;
								return (
									<li key={p.id}>
										<button
											type="button"
											onClick={() => setField("parentId", p.id)}
											className={`flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-2 text-left text-sm last:border-b-0 ${
												selected
													? "bg-accent/10 text-text"
													: "text-text-muted hover:bg-border/30 hover:text-text"
											}`}
										>
											<span className="font-medium text-text">
												{p.canonicalName}
											</span>
											<code className="font-mono text-xs">{p.id}</code>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				{selectedParent && (
					<p className="m-0 text-sm text-text-muted">
						Selected:{" "}
						<strong className="font-semibold text-text">
							{selectedParent.canonicalName}
						</strong>{" "}
						(<code className="font-mono">{selectedParent.id}</code>) &mdash;{" "}
						{selectedParent.description}
					</p>
				)}
			</section>

			<section className="flex flex-col gap-3">
				<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
					Attribution
				</h3>
				<Field
					htmlFor="alias-contributor"
					label="Your name (optional, used as `curator` in provenance)"
				>
					<TextInput
						id="alias-contributor"
						value={state.contributorName}
						onChange={(e) => setField("contributorName", e.target.value)}
						placeholder="Jane Doe"
					/>
				</Field>
			</section>

			<details className="rounded-md border border-border bg-surface">
				<summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium text-accent">
					Preview YAML ({yamlBytes} bytes)
				</summary>
				<pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words border-t border-border bg-code-bg p-4 font-mono text-xs leading-relaxed text-text">
					{yaml}
				</pre>
			</details>

			{!validation.ok && (
				<Banner>
					<strong className="font-semibold">Fix these before submitting:</strong>
					<ul className="mt-1 flex list-none flex-col gap-1 p-0">
						{validation.errors.map((e, i) => (
							<li key={i} className="text-sm text-text">
								<code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-[0.875em]">
									{e.field}
								</code>
								: {e.message}
							</li>
						))}
					</ul>
				</Banner>
			)}

			{tooLong && (
				<Banner>
					Your YAML is {yamlBytes} bytes &mdash; trim the description.
				</Banner>
			)}

			<div className="flex flex-wrap gap-3">
				<Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
					Open PR on GitHub
				</Button>
				<Button variant="secondary" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</>
	);
}
