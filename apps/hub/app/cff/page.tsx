"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { KNOWN_LICENSES } from "@citey/citation-model";
import {
	Banner,
	Button,
	Field,
	Select,
	TextArea,
	TextInput,
} from "../_ui/primitives";
import { useCffForm, type AuthorFormState } from "@/lib/cff/state";
import { toCffYaml } from "@/lib/cff/yaml";
import { validate } from "@/lib/cff/validate";

const LICENSE_OPTIONS = Array.from(KNOWN_LICENSES).sort();

interface AuthorFieldsProps {
	author: AuthorFormState;
	index: number;
	prefix: string;
	onChange: (index: number, author: AuthorFormState) => void;
	onRemove: (index: number) => void;
	removable: boolean;
	errors: Map<string, string>;
}

function AuthorFields({
	author,
	index,
	prefix,
	onChange,
	onRemove,
	removable,
	errors,
}: AuthorFieldsProps) {
	const set = (key: keyof AuthorFormState, value: string) =>
		onChange(index, { ...author, [key]: value });

	return (
		<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
			<div className="grid grid-cols-2 gap-3">
				<Field
					htmlFor={`${prefix}-family-${index}`}
					label="Family name"
					error={errors.get(`${prefix}[${index}].family`)}
				>
					<TextInput
						id={`${prefix}-family-${index}`}
						value={author.family}
						onChange={(e) => set("family", e.target.value)}
						placeholder="Doe"
						error={errors.get(`${prefix}[${index}].family`)}
					/>
				</Field>
				<Field
					htmlFor={`${prefix}-given-${index}`}
					label="Given name"
					error={errors.get(`${prefix}[${index}].given`)}
				>
					<TextInput
						id={`${prefix}-given-${index}`}
						value={author.given}
						onChange={(e) => set("given", e.target.value)}
						placeholder="Jane"
						error={errors.get(`${prefix}[${index}].given`)}
					/>
				</Field>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<Field
					htmlFor={`${prefix}-orcid-${index}`}
					label="ORCID"
					error={errors.get(`${prefix}[${index}].orcid`)}
				>
					<TextInput
						id={`${prefix}-orcid-${index}`}
						value={author.orcid}
						onChange={(e) => set("orcid", e.target.value)}
						placeholder="0000-0000-0000-0000"
						error={errors.get(`${prefix}[${index}].orcid`)}
					/>
				</Field>
				<Field
					htmlFor={`${prefix}-affiliation-${index}`}
					label="Affiliation"
				>
					<TextInput
						id={`${prefix}-affiliation-${index}`}
						value={author.affiliation}
						onChange={(e) => set("affiliation", e.target.value)}
						placeholder="University of Example"
					/>
				</Field>
			</div>
			{removable && (
				<Button
					variant="ghost"
					className="self-end px-3 py-1 text-xs"
					onClick={() => onRemove(index)}
				>
					Remove author
				</Button>
			)}
		</div>
	);
}

export default function CffGenerator() {
	const {
		state,
		setField,
		toggleAdvanced,
		setAuthor,
		addAuthor,
		removeAuthor,
		setIdentifier,
		addIdentifier,
		removeIdentifier,
		setPreferredCitation,
		setPcAuthor,
		addPcAuthor,
		removePcAuthor,
		populateFromExtract,
	} = useCffForm();

	const [fromUrl, setFromUrl] = useState("");
	const [loading, setLoading] = useState(false);
	const [generateError, setGenerateError] = useState<string | null>(null);
	const [generateNotice, setGenerateNotice] = useState<string | null>(null);

	const yaml = useMemo(() => toCffYaml(state), [state]);
	const validation = useMemo(() => validate(state), [state]);

	const errorMap = useMemo(() => {
		const map = new Map<string, string>();
		if (!validation.ok) {
			for (const err of validation.errors) {
				map.set(err.field, err.message);
			}
		}
		return map;
	}, [validation]);

	const downloadAnchorRef = useRef<HTMLAnchorElement | null>(null);

	const handleDownload = useCallback(() => {
		const blob = new Blob([yaml], { type: "text/yaml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = downloadAnchorRef.current;
		if (anchor) {
			anchor.href = url;
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}, [yaml]);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(yaml);
		} catch {
			/* clipboard write can fail; ignore */
		}
	}, [yaml]);

	async function handleGenerate() {
		const url = fromUrl.trim();
		if (!url) return; // button is disabled in this state, but defensive
		setLoading(true);
		setGenerateError(null);
		setGenerateNotice(null);
		try {
			const res = await fetch(
				`/api/cff/from-url?url=${encodeURIComponent(url)}`,
				{ cache: "no-store" }
			);
			const json = await res.json();
			if (!res.ok) {
				const msg = typeof json?.message === "string" && json.message
					? `${json.error}: ${json.message}`
					: json?.error ?? "Generate failed";
				setGenerateError(msg);
				return;
			}
			populateFromExtract(json);
			if (Array.isArray(json.authors) && json.authors.length === 0) {
				setGenerateNotice("Couldn’t auto-fill authors — add manually");
			}
		} catch (e) {
			setGenerateError("Could not reach the generator");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="mx-auto max-w-6xl px-6 py-10">
			<h1 className="mb-2 text-3xl font-bold text-text">CFF Generator</h1>
			<p className="mb-8 max-w-prose text-lg text-text-muted">
				Generate a valid <code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-[0.875em]">CITATION.cff</code>{" "}
				file for your software project.
			</p>

			<div className="grid items-start gap-10 lg:grid-cols-2">
				{/* Form */}
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
						<Field htmlFor="cff-from-url" label="Generate from repo URL">
							<div className="flex gap-2">
								<TextInput
									id="cff-from-url"
									value={fromUrl}
									onChange={(e) => setFromUrl(e.target.value)}
									placeholder="https://github.com/owner/repo"
								/>
								<Button
									variant="primary"
									onClick={handleGenerate}
									disabled={loading || !fromUrl.trim()}
								>
									{loading ? "Working…" : "Generate"}
								</Button>
							</div>
						</Field>
						{generateError && <Banner>{generateError}</Banner>}
						{generateNotice && <Banner>{generateNotice}</Banner>}
					</div>

					<h2 className="border-b border-border pb-2 text-lg font-semibold text-text">
						Essential Fields
					</h2>

					<Field htmlFor="cff-title" label="Title" error={errorMap.get("title")}>
						<TextInput
							id="cff-title"
							value={state.title}
							onChange={(e) => setField("title", e.target.value)}
							placeholder="My Software"
							error={errorMap.get("title")}
						/>
					</Field>

					<Field htmlFor="cff-message" label="Citation message">
						<TextInput
							id="cff-message"
							value={state.message}
							onChange={(e) => setField("message", e.target.value)}
							placeholder="If you use this software, please cite it..."
						/>
					</Field>

					<div className="grid grid-cols-2 gap-3">
						<Field htmlFor="cff-version" label="Version">
							<TextInput
								id="cff-version"
								value={state.version}
								onChange={(e) => setField("version", e.target.value)}
								placeholder="1.0.0"
							/>
						</Field>
						<Field
							htmlFor="cff-date-released"
							label="Date released"
							error={errorMap.get("dateReleased")}
						>
							<TextInput
								id="cff-date-released"
								value={state.dateReleased}
								onChange={(e) => setField("dateReleased", e.target.value)}
								placeholder="2025-01-15"
								error={errorMap.get("dateReleased")}
							/>
						</Field>
					</div>

					<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
						Authors
					</h3>
					{errorMap.get("authors") && <Banner>{errorMap.get("authors")}</Banner>}
					{state.authors.map((author, i) => (
						<AuthorFields
							key={i}
							author={author}
							index={i}
							prefix="authors"
							onChange={setAuthor}
							onRemove={removeAuthor}
							removable={state.authors.length > 1}
							errors={errorMap}
						/>
					))}
					<Button variant="secondary" onClick={addAuthor}>
						+ Add author
					</Button>

					<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
						Links &amp; Identifiers
					</h3>

					<Field htmlFor="cff-url" label="URL" error={errorMap.get("url")}>
						<TextInput
							id="cff-url"
							value={state.url}
							onChange={(e) => setField("url", e.target.value)}
							placeholder="https://example.com/my-software"
							error={errorMap.get("url")}
						/>
					</Field>

					<Field
						htmlFor="cff-repository"
						label="Repository URL"
						error={errorMap.get("repositoryCode")}
					>
						<TextInput
							id="cff-repository"
							value={state.repositoryCode}
							onChange={(e) => setField("repositoryCode", e.target.value)}
							placeholder="https://github.com/user/repo"
							error={errorMap.get("repositoryCode")}
						/>
					</Field>

					<div className="grid grid-cols-2 gap-3">
						<Field htmlFor="cff-doi" label="DOI" error={errorMap.get("doi")}>
							<TextInput
								id="cff-doi"
								value={state.doi}
								onChange={(e) => setField("doi", e.target.value)}
								placeholder="10.5281/zenodo.1234567"
								error={errorMap.get("doi")}
							/>
						</Field>
						<Field
							htmlFor="cff-license"
							label="License (SPDX)"
							error={errorMap.get("license")}
						>
							<Select
								id="cff-license"
								value={state.license}
								onChange={(e) => setField("license", e.target.value)}
								error={errorMap.get("license")}
							>
								<option value="">-- Select license --</option>
								{LICENSE_OPTIONS.map((l) => (
									<option key={l} value={l}>
										{l}
									</option>
								))}
							</Select>
						</Field>
					</div>

					<Field htmlFor="cff-keywords" label="Keywords (comma-separated)">
						<TextInput
							id="cff-keywords"
							value={state.keywords}
							onChange={(e) => setField("keywords", e.target.value)}
							placeholder="citation, software, research"
						/>
					</Field>

					{/* Advanced */}
					<button
						type="button"
						onClick={toggleAdvanced}
						aria-expanded={state.advancedOpen}
						data-testid="advanced-toggle"
						className="flex items-center gap-2 py-2 text-base font-semibold text-accent hover:text-accent-hover"
					>
						<span
							className={`inline-block transition-transform ${state.advancedOpen ? "rotate-90" : ""}`}
						>
							&#9654;
						</span>
						Advanced
					</button>

					{state.advancedOpen && (
						<div
							className="flex flex-col gap-5"
							data-testid="advanced-section"
						>
							<Field htmlFor="cff-abstract" label="Abstract">
								<TextArea
									id="cff-abstract"
									value={state.abstract}
									onChange={(e) => setField("abstract", e.target.value)}
									placeholder="A brief description of your software..."
									rows={3}
								/>
							</Field>

							<Field htmlFor="cff-type" label="Type">
								<Select
									id="cff-type"
									value={state.type}
									onChange={(e) =>
										setField("type", e.target.value as "software" | "dataset")
									}
								>
									<option value="software">software</option>
									<option value="dataset">dataset</option>
								</Select>
							</Field>

							<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
								Identifiers
							</h3>
							{state.identifiers.map((id, i) => (
								<div
									key={i}
									className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
								>
									<div className="grid grid-cols-2 gap-3">
										<Field htmlFor={`cff-id-type-${i}`} label="Type">
											<Select
												id={`cff-id-type-${i}`}
												value={id.type}
												onChange={(e) =>
													setIdentifier(i, { ...id, type: e.target.value })
												}
											>
												<option value="doi">doi</option>
												<option value="url">url</option>
												<option value="swh">swh</option>
												<option value="other">other</option>
											</Select>
										</Field>
										<Field htmlFor={`cff-id-value-${i}`} label="Value">
											<TextInput
												id={`cff-id-value-${i}`}
												value={id.value}
												onChange={(e) =>
													setIdentifier(i, { ...id, value: e.target.value })
												}
												placeholder="10.5281/zenodo.1234567"
											/>
										</Field>
									</div>
									<Field htmlFor={`cff-id-desc-${i}`} label="Description">
										<TextInput
											id={`cff-id-desc-${i}`}
											value={id.description}
											onChange={(e) =>
												setIdentifier(i, {
													...id,
													description: e.target.value,
												})
											}
											placeholder="The concept DOI"
										/>
									</Field>
									<Button
										variant="ghost"
										className="self-end px-3 py-1 text-xs"
										onClick={() => removeIdentifier(i)}
									>
										Remove identifier
									</Button>
								</div>
							))}
							<Button variant="secondary" onClick={addIdentifier}>
								+ Add identifier
							</Button>

							<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
								Preferred Citation
							</h3>
							<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
								<div className="grid grid-cols-2 gap-3">
									<Field htmlFor="cff-pc-type" label="Type">
										<Select
											id="cff-pc-type"
											value={state.preferredCitation.type}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													type: e.target.value,
												})
											}
										>
											<option value="article">article</option>
											<option value="book">book</option>
											<option value="conference-paper">conference-paper</option>
											<option value="software">software</option>
											<option value="misc">misc</option>
										</Select>
									</Field>
									<Field htmlFor="cff-pc-title" label="Title">
										<TextInput
											id="cff-pc-title"
											value={state.preferredCitation.title}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													title: e.target.value,
												})
											}
											placeholder="Paper title"
										/>
									</Field>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<Field htmlFor="cff-pc-journal" label="Journal">
										<TextInput
											id="cff-pc-journal"
											value={state.preferredCitation.journal}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													journal: e.target.value,
												})
											}
											placeholder="Journal of Open Source Software"
										/>
									</Field>
									<Field htmlFor="cff-pc-doi" label="DOI">
										<TextInput
											id="cff-pc-doi"
											value={state.preferredCitation.doi}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													doi: e.target.value,
												})
											}
											placeholder="10.xxxx/..."
										/>
									</Field>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<Field htmlFor="cff-pc-volume" label="Volume">
										<TextInput
											id="cff-pc-volume"
											value={state.preferredCitation.volume}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													volume: e.target.value,
												})
											}
										/>
									</Field>
									<Field htmlFor="cff-pc-issue" label="Issue">
										<TextInput
											id="cff-pc-issue"
											value={state.preferredCitation.issue}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													issue: e.target.value,
												})
											}
										/>
									</Field>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<Field htmlFor="cff-pc-year" label="Year">
										<TextInput
											id="cff-pc-year"
											value={state.preferredCitation.year}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													year: e.target.value,
												})
											}
											placeholder="2025"
										/>
									</Field>
									<Field htmlFor="cff-pc-url" label="URL">
										<TextInput
											id="cff-pc-url"
											value={state.preferredCitation.url}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													url: e.target.value,
												})
											}
										/>
									</Field>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<Field htmlFor="cff-pc-start" label="Start page">
										<TextInput
											id="cff-pc-start"
											value={state.preferredCitation.start}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													start: e.target.value,
												})
											}
										/>
									</Field>
									<Field htmlFor="cff-pc-end" label="End page">
										<TextInput
											id="cff-pc-end"
											value={state.preferredCitation.end}
											onChange={(e) =>
												setPreferredCitation({
													...state.preferredCitation,
													end: e.target.value,
												})
											}
										/>
									</Field>
								</div>

								<h4 className="mt-2 text-sm font-semibold text-text">
									Citation Authors
								</h4>
								{state.preferredCitation.authors.map((author, i) => (
									<AuthorFields
										key={i}
										author={author}
										index={i}
										prefix="pc-authors"
										onChange={setPcAuthor}
										onRemove={removePcAuthor}
										removable={state.preferredCitation.authors.length > 1}
										errors={errorMap}
									/>
								))}
								<Button variant="secondary" onClick={addPcAuthor}>
									+ Add citation author
								</Button>
							</div>
						</div>
					)}

					{!validation.ok && (
						<Banner>
							<strong className="font-semibold">Validation issues:</strong>
							<ul className="mt-1 flex list-none flex-col gap-1 p-0">
								{validation.errors.map((err, i) => (
									<li key={i} className="text-sm text-text">
										<code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-[0.875em]">
											{err.field}
										</code>
										: {err.message}
									</li>
								))}
							</ul>
						</Banner>
					)}

					<div className="flex flex-wrap gap-3">
						<a
							ref={downloadAnchorRef}
							download="CITATION.cff"
							className="hidden"
							aria-hidden="true"
						/>
						<Button
							variant="primary"
							onClick={handleDownload}
							aria-label="Download CITATION.cff"
						>
							Download CITATION.cff
						</Button>
						<Button
							variant="secondary"
							onClick={handleCopy}
							aria-label="Copy YAML"
						>
							Copy YAML
						</Button>
					</div>
				</div>

				{/* Preview */}
				<div className="lg:sticky lg:top-6">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-text">YAML Preview</h2>
					</div>
					<pre
						data-testid="yaml-preview"
						aria-label="YAML preview"
						className="max-h-[75vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-code-bg p-5 font-mono text-[0.8125rem] leading-relaxed text-text"
					>
						{yaml}
					</pre>
				</div>
			</div>
		</main>
	);
}
