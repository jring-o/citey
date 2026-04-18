"use client";

import { useEffect, useState } from "react";
import { Banner, Button } from "../../_ui/primitives";
import { initialSeedFormState, type SeedFormState } from "@/lib/seed/state";
import { toSeedYaml } from "@/lib/seed/yaml";
import { validateSeed, type ValidationError } from "@/lib/seed/validate";
import { buildGithubNewFileUrl, MAX_YAML_BYTES } from "@/lib/seed/github-url";
import { parseRepoUrl } from "@/lib/seed/parse-repo-url";
import { fetchRepoMetadata } from "@/lib/seed/fetch-metadata";
import { applyFetchedMetadata } from "@/lib/seed/apply-metadata";

type Status =
	| { kind: "idle" }
	| { kind: "loading" }
	| {
			kind: "ready";
			state: SeedFormState;
			yaml: string;
			cffBranch?: string;
			codemetaBranch?: string;
	  }
	| {
			kind: "invalid";
			errors: ValidationError[];
			cffBranch?: string;
			codemetaBranch?: string;
	  }
	| { kind: "error"; message: string }
	| { kind: "submitted" };

interface Props {
	open: boolean;
	onClose: () => void;
}

export function AddPackageModal({ open, onClose }: Props) {
	const [repoUrl, setRepoUrl] = useState("");
	const [status, setStatus] = useState<Status>({ kind: "idle" });

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

	const handleClose = () => {
		setRepoUrl("");
		setStatus({ kind: "idle" });
		onClose();
	};

	const handleSubmit = async () => {
		const parsed = parseRepoUrl(repoUrl);
		if (!parsed) {
			setStatus({
				kind: "error",
				message: "That doesn't look like a GitHub repo URL.",
			});
			return;
		}

		setStatus({ kind: "loading" });
		try {
			const meta = await fetchRepoMetadata(parsed.owner, parsed.repo);
			const repoCanonicalUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
			const result = applyFetchedMetadata({
				cff: meta.cff,
				codemeta: meta.codemeta,
				repoUrl: repoCanonicalUrl,
			});

			const yaml = toSeedYaml(result.state);
			const yamlBytes = new TextEncoder().encode(yaml).length;
			const validation = validateSeed(result.state);

			if (!validation.ok) {
				setStatus({
					kind: "invalid",
					errors: validation.errors,
					cffBranch: meta.cffBranch,
					codemetaBranch: meta.codemetaBranch,
				});
				return;
			}

			if (yamlBytes > MAX_YAML_BYTES) {
				setStatus({
					kind: "error",
					message: `The generated YAML is ${yamlBytes} bytes — GitHub deep-link cap is ${MAX_YAML_BYTES}. Trim your description.`,
				});
				return;
			}

			const url = buildGithubNewFileUrl({
				ecosystem: result.state.ecosystem,
				id: result.state.id,
				yaml,
			});
			window.open(url, "_blank", "noopener,noreferrer");
			setStatus({ kind: "submitted" });
		} catch (err) {
			setStatus({
				kind: "error",
				message: err instanceof Error ? err.message : "Fetch failed.",
			});
		}
	};

	if (!open) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="add-package-title"
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
			onClick={handleClose}
		>
			<div
				className="w-full max-w-xl rounded-xl border border-border bg-bg shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<header className="flex items-center justify-between border-b border-border px-6 py-4">
					<h2
						id="add-package-title"
						className="text-xl font-semibold text-text"
					>
						Add a package
					</h2>
					<Button variant="ghost" onClick={handleClose} aria-label="Close">
						✕
					</Button>
				</header>

				<div className="flex flex-col gap-5 p-6">
					{status.kind === "submitted" ? (
						<SuccessPanel onClose={handleClose} />
					) : (
						<UrlEntry
							repoUrl={repoUrl}
							setRepoUrl={setRepoUrl}
							status={status}
							onSubmit={handleSubmit}
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
				Review the prefilled file and click <em>“Commit new file → Propose
				changes”</em>. GitHub will fork the repo for you if needed. Our CI
				validates the schema automatically.
			</Banner>
			<Button variant="primary" onClick={onClose}>
				Done
			</Button>
		</div>
	);
}

interface UrlEntryProps {
	repoUrl: string;
	setRepoUrl: (s: string) => void;
	status: Status;
	onSubmit: () => void;
}

function UrlEntry({ repoUrl, setRepoUrl, status, onSubmit }: UrlEntryProps) {
	const loading = status.kind === "loading";
	return (
		<>
			<p className="text-sm text-text-muted">
				Paste the GitHub URL of your repo. We&rsquo;ll read its{" "}
				<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
					CITATION.cff
				</code>{" "}
				and{" "}
				<code className="rounded bg-code-bg px-1 py-0.5 font-mono text-[0.85em]">
					codemeta.json
				</code>
				, build a Citey citation, and open a pull request for you. Make sure
				those files exist and are well-formed first.
			</p>

			<div className="flex flex-col gap-2">
				<label
					htmlFor="add-repo-url"
					className="text-sm font-semibold text-text"
				>
					GitHub repo URL
				</label>
				<div className="flex flex-wrap items-stretch gap-2">
					<input
						id="add-repo-url"
						type="text"
						value={repoUrl}
						onChange={(e) => setRepoUrl(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								if (!loading && repoUrl.trim()) onSubmit();
							}
						}}
						placeholder="https://github.com/owner/repo"
						className="min-w-[16rem] flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
						autoFocus
					/>
					<Button
						variant="primary"
						onClick={onSubmit}
						disabled={loading || !repoUrl.trim()}
					>
						{loading ? "Working…" : "Submit"}
					</Button>
				</div>
			</div>

			{status.kind === "error" && (
				<Banner>
					<strong className="font-semibold">Couldn&rsquo;t submit.</strong>{" "}
					{status.message}
				</Banner>
			)}

			{status.kind === "invalid" && (
				<InvalidPanel
					errors={status.errors}
					cffBranch={status.cffBranch}
					codemetaBranch={status.codemetaBranch}
				/>
			)}
		</>
	);
}

function InvalidPanel({
	errors,
	cffBranch,
	codemetaBranch,
}: {
	errors: ValidationError[];
	cffBranch?: string;
	codemetaBranch?: string;
}) {
	const foundAnything = cffBranch || codemetaBranch;
	return (
		<Banner>
			<strong className="font-semibold">
				We couldn&rsquo;t build a valid citation from this repo.
			</strong>
			<div className="mt-2 text-xs text-text-muted">
				{cffBranch ? (
					<>
						✓ Found <code className="font-mono">CITATION.cff</code> on{" "}
						<code className="font-mono">{cffBranch}</code>
						<br />
					</>
				) : (
					<>
						— No <code className="font-mono">CITATION.cff</code>
						<br />
					</>
				)}
				{codemetaBranch ? (
					<>
						✓ Found <code className="font-mono">codemeta.json</code> on{" "}
						<code className="font-mono">{codemetaBranch}</code>
					</>
				) : (
					<>
						— No <code className="font-mono">codemeta.json</code>
					</>
				)}
			</div>
			<p className="mt-2 text-sm text-text">
				{foundAnything
					? "Your files are missing required fields. Add them and try again:"
					: "Citey enforces a software citation model. Generate the files first using the CFF and CodeMeta generators on this site, commit them to your repo, then come back."}
			</p>
			<ul className="mt-1 flex list-none flex-col gap-1 p-0">
				{errors.map((e, i) => (
					<li key={i} className="text-sm text-text">
						<code className="rounded bg-code-bg px-1.5 py-0.5 font-mono text-[0.875em]">
							{e.field}
						</code>
						: {e.message}
					</li>
				))}
			</ul>
		</Banner>
	);
}
