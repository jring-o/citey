"use client";

import { useCallback, useMemo, useRef } from "react";
import { KNOWN_LICENSES } from "@citey/citation-model";
import {
	Banner,
	Button,
	Field,
	Select,
	TextArea,
	TextInput,
} from "../_ui/primitives";
import {
	useCodemetaForm,
	type AuthorFormState,
} from "@/lib/codemeta/state";
import { toCodemetaJson } from "@/lib/codemeta/json";
import { validate } from "@/lib/codemeta/validate";

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
					htmlFor={`${prefix}-email-${index}`}
					label="Email"
					error={errors.get(`${prefix}[${index}].email`)}
				>
					<TextInput
						id={`${prefix}-email-${index}`}
						value={author.email}
						onChange={(e) => set("email", e.target.value)}
						placeholder="jane@example.com"
						error={errors.get(`${prefix}[${index}].email`)}
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

export default function CodemetaGenerator() {
	const {
		state,
		setField,
		toggleAdvanced,
		setAuthor,
		addAuthor,
		removeAuthor,
		setFundingReference,
		addFundingReference,
		removeFundingReference,
	} = useCodemetaForm();

	const json = useMemo(() => toCodemetaJson(state), [state]);
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
		const blob = new Blob([json], {
			type: "application/ld+json;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const anchor = downloadAnchorRef.current;
		if (anchor) {
			anchor.href = url;
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}, [json]);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(json);
		} catch {
			/* ignore */
		}
	}, [json]);

	return (
		<main className="mx-auto max-w-6xl px-6 py-10">
			<h1 className="mb-2 text-3xl font-bold text-text">CodeMeta Generator</h1>
			<p className="mb-8 max-w-prose text-lg text-text-muted">
				Generate a valid <code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-[0.875em]">codemeta.json</code>{" "}
				file for your software project. All processing happens in your browser
				&mdash; nothing is sent to a server.
			</p>

			<div className="grid items-start gap-10 lg:grid-cols-2">
				{/* Form */}
				<div className="flex flex-col gap-5">
					<h2 className="border-b border-border pb-2 text-lg font-semibold text-text">
						Essential Fields
					</h2>

					<Field htmlFor="cm-name" label="Name" error={errorMap.get("name")}>
						<TextInput
							id="cm-name"
							value={state.name}
							onChange={(e) => setField("name", e.target.value)}
							placeholder="My Software"
							error={errorMap.get("name")}
						/>
					</Field>

					<Field htmlFor="cm-description" label="Description">
						<TextArea
							id="cm-description"
							value={state.description}
							onChange={(e) => setField("description", e.target.value)}
							placeholder="A brief description of your software..."
							rows={3}
						/>
					</Field>

					<div className="grid grid-cols-2 gap-3">
						<Field htmlFor="cm-version" label="Version">
							<TextInput
								id="cm-version"
								value={state.version}
								onChange={(e) => setField("version", e.target.value)}
								placeholder="1.0.0"
							/>
						</Field>
						<Field
							htmlFor="cm-license"
							label="License (SPDX)"
							error={errorMap.get("license")}
						>
							<Select
								id="cm-license"
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

					<div className="grid grid-cols-2 gap-3">
						<Field
							htmlFor="cm-date-created"
							label="Date created"
							error={errorMap.get("dateCreated")}
						>
							<TextInput
								id="cm-date-created"
								value={state.dateCreated}
								onChange={(e) => setField("dateCreated", e.target.value)}
								placeholder="2025-01-15"
								error={errorMap.get("dateCreated")}
							/>
						</Field>
						<Field
							htmlFor="cm-date-modified"
							label="Date modified"
							error={errorMap.get("dateModified")}
						>
							<TextInput
								id="cm-date-modified"
								value={state.dateModified}
								onChange={(e) => setField("dateModified", e.target.value)}
								placeholder="2025-06-01"
								error={errorMap.get("dateModified")}
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

					<Field htmlFor="cm-url" label="URL" error={errorMap.get("url")}>
						<TextInput
							id="cm-url"
							value={state.url}
							onChange={(e) => setField("url", e.target.value)}
							placeholder="https://example.com/my-software"
							error={errorMap.get("url")}
						/>
					</Field>

					<Field
						htmlFor="cm-repository"
						label="Code repository"
						error={errorMap.get("codeRepository")}
					>
						<TextInput
							id="cm-repository"
							value={state.codeRepository}
							onChange={(e) => setField("codeRepository", e.target.value)}
							placeholder="https://github.com/user/repo"
							error={errorMap.get("codeRepository")}
						/>
					</Field>

					<Field
						htmlFor="cm-identifier"
						label="Identifier (DOI URL)"
						error={errorMap.get("identifier")}
					>
						<TextInput
							id="cm-identifier"
							value={state.identifier}
							onChange={(e) => setField("identifier", e.target.value)}
							placeholder="https://doi.org/10.5281/zenodo.1234567"
							error={errorMap.get("identifier")}
						/>
					</Field>

					<Field
						htmlFor="cm-languages"
						label="Programming languages (comma-separated)"
					>
						<TextInput
							id="cm-languages"
							value={state.programmingLanguage}
							onChange={(e) => setField("programmingLanguage", e.target.value)}
							placeholder="Python, R, JavaScript"
						/>
					</Field>

					<Field htmlFor="cm-keywords" label="Keywords (comma-separated)">
						<TextInput
							id="cm-keywords"
							value={state.keywords}
							onChange={(e) => setField("keywords", e.target.value)}
							placeholder="citation, software, research"
						/>
					</Field>

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
							<Field htmlFor="cm-app-category" label="Application category">
								<TextInput
									id="cm-app-category"
									value={state.applicationCategory}
									onChange={(e) =>
										setField("applicationCategory", e.target.value)
									}
									placeholder="Scientific"
								/>
							</Field>

							<Field
								htmlFor="cm-os"
								label="Operating systems (comma-separated)"
							>
								<TextInput
									id="cm-os"
									value={state.operatingSystem}
									onChange={(e) => setField("operatingSystem", e.target.value)}
									placeholder="Linux, macOS, Windows"
								/>
							</Field>

							<Field
								htmlFor="cm-requirements"
								label="Software requirements (comma-separated)"
							>
								<TextInput
									id="cm-requirements"
									value={state.softwareRequirements}
									onChange={(e) =>
										setField("softwareRequirements", e.target.value)
									}
									placeholder="Python >= 3.8, NumPy >= 1.20"
								/>
							</Field>

							<Field htmlFor="cm-dev-status" label="Development status">
								<Select
									id="cm-dev-status"
									value={state.developmentStatus}
									onChange={(e) =>
										setField("developmentStatus", e.target.value)
									}
								>
									<option value="">-- Select status --</option>
									<option value="concept">Concept</option>
									<option value="wip">Work in progress</option>
									<option value="suspended">Suspended</option>
									<option value="abandoned">Abandoned</option>
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
									<option value="unsupported">Unsupported</option>
									<option value="moved">Moved</option>
								</Select>
							</Field>

							<Field htmlFor="cm-funding" label="Funding">
								<TextInput
									id="cm-funding"
									value={state.funding}
									onChange={(e) => setField("funding", e.target.value)}
									placeholder="NSF Grant #12345"
								/>
							</Field>

							<h3 className="border-b border-border pb-2 text-base font-semibold text-text">
								Funding References
							</h3>
							{state.fundingReferences.map((ref, i) => (
								<div
									key={i}
									className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
								>
									<Field htmlFor={`cm-fr-funder-${i}`} label="Funder name">
										<TextInput
											id={`cm-fr-funder-${i}`}
											value={ref.funderName}
											onChange={(e) =>
												setFundingReference(i, {
													...ref,
													funderName: e.target.value,
												})
											}
											placeholder="National Science Foundation"
										/>
									</Field>
									<div className="grid grid-cols-2 gap-3">
										<Field htmlFor={`cm-fr-award-${i}`} label="Award number">
											<TextInput
												id={`cm-fr-award-${i}`}
												value={ref.awardNumber}
												onChange={(e) =>
													setFundingReference(i, {
														...ref,
														awardNumber: e.target.value,
													})
												}
												placeholder="12345"
											/>
										</Field>
										<Field htmlFor={`cm-fr-title-${i}`} label="Award title">
											<TextInput
												id={`cm-fr-title-${i}`}
												value={ref.awardTitle}
												onChange={(e) =>
													setFundingReference(i, {
														...ref,
														awardTitle: e.target.value,
													})
												}
												placeholder="Research grant title"
											/>
										</Field>
									</div>
									<Button
										variant="ghost"
										className="self-end px-3 py-1 text-xs"
										onClick={() => removeFundingReference(i)}
									>
										Remove funding reference
									</Button>
								</div>
							))}
							<Button variant="secondary" onClick={addFundingReference}>
								+ Add funding reference
							</Button>

							<Field htmlFor="cm-ref-pub" label="Reference publication">
								<TextInput
									id="cm-ref-pub"
									value={state.referencePublication}
									onChange={(e) =>
										setField("referencePublication", e.target.value)
									}
									placeholder="https://doi.org/10.xxxx/..."
								/>
							</Field>
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
							download="codemeta.json"
							className="hidden"
							aria-hidden="true"
						/>
						<Button
							variant="primary"
							onClick={handleDownload}
							aria-label="Download codemeta.json"
						>
							Download codemeta.json
						</Button>
						<Button
							variant="secondary"
							onClick={handleCopy}
							aria-label="Copy JSON"
						>
							Copy JSON
						</Button>
					</div>
				</div>

				{/* Preview */}
				<div className="lg:sticky lg:top-6">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-text">JSON Preview</h2>
					</div>
					<pre
						data-testid="json-preview"
						aria-label="JSON preview"
						className="max-h-[75vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-code-bg p-5 font-mono text-[0.8125rem] leading-relaxed text-text"
					>
						{json}
					</pre>
				</div>
			</div>
		</main>
	);
}
