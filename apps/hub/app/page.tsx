import Image from "next/image";
import Link from "next/link";

import { ImageLightbox } from "./_ui/ImageLightbox";

interface Step {
	number: number;
	title: string;
	description: string;
	href: string;
	cta: string;
}

const STEPS: Step[] = [
	{
		number: 1,
		title: "Read about software citation",
		description:
			"Why software citation matters, what to cite, and which standards Citey enforces.",
		href: "/whitepaper",
		cta: "Read the guide →",
	},
	{
		number: 2,
		title: "Generate a CITATION.cff for your repo",
		description:
			"Create the standard Citation File Format file.",
		href: "/cff",
		cta: "Open CFF generator →",
	},
	{
		number: 3,
		title: "Generate a codemeta.json for your repo",
		description:
			"Create the JSON-LD metadata file that software registries (Software Heritage, JOSS, etc.) consume for indexing.",
		href: "/codemeta",
		cta: "Open CodeMeta generator →",
	},
	{
		number: 4,
		title: "Add your repo to Citey's database",
		description:
			"Paste your repo URL. Citey reads the files you just committed, builds a citation, and opens a pull request for you.",
		href: "/packages",
		cta: "Add your package →",
	},
];

export default function Landing() {
	return (
		<main className="mx-auto max-w-4xl px-6 py-16">
			<section className="mb-14 text-center">
				<Image
					src="/citey-hero.png"
					alt="Citey, a friendly square-bracket mascot, popping up on a research paper to offer one-click citations for the software it mentions."
					width={1376}
					height={768}
					priority
					sizes="(min-width: 768px) 768px, 100vw"
					className="mx-auto mb-8 h-auto w-full max-w-2xl rounded-xl"
				/>
				<h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-text sm:text-5xl">
					Making software citation as easy as
					<br />
					1, 2, 3.
				</h1>
				<p className="mx-auto mb-5 max-w-prose text-lg leading-relaxed text-text-muted">
					Citey is a browser extension and toolkit that turns software citation
					into a single-button action for researchers.
				</p>
				<video
					src="/citey-hero.mp4"
					autoPlay
					loop
					muted
					playsInline
					className="mx-auto h-auto w-full max-w-2xl rounded-xl"
				/>
			</section>

			<section className="mb-14">
				<p className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-text-muted">
					Citey, where researchers already work
				</p>
				<div className="grid gap-5 sm:grid-cols-2">
					<ImageLightbox
						src="/demo-arxiv.png"
						alt="Citey popup on an arXiv PDF, matching Astropy, Ray, and NumPy in the paper."
						width={1919}
						height={1060}
						caption="On arXiv — match the software cited in a paper as you read."
						priority
					/>
					<ImageLightbox
						src="/demo-overleaf.png"
						alt="Citey popup on an Overleaf LaTeX project, ready to export .bib entries."
						width={1919}
						height={1075}
						caption="In Overleaf — drop citations straight into your .bib as you write."
					/>
				</div>
			</section>

			<section className="mb-14">
				<div className="mx-auto max-w-2xl rounded-xl border border-border bg-surface p-5 text-center">
					<p className="m-0 text-[0.95rem] leading-relaxed text-text-muted">
						<span className="font-semibold text-text">
							Citey isn&rsquo;t in the Chrome Web Store yet.
						</span>{" "}
						To use it today, clone the repo and load the unpacked extension in
						Chrome —{" "}
						<a
							href="https://github.com/jring-o/citey#install-from-source"
							target="_blank"
							rel="noopener noreferrer"
							className="font-semibold text-accent no-underline hover:text-accent-hover hover:underline"
						>
							follow the install instructions on GitHub →
						</a>
					</p>
				</div>
			</section>

			<hr className="my-20 border-0 border-t-2 border-text" />

			<section className="mb-8 text-center">
				<h2 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-text sm:text-3xl">
					Citey currently runs on a static database of software mapping
				</h2>
				<p className="mx-auto max-w-prose text-lg leading-relaxed text-text-muted">
					Get your software into the database in four steps.
				</p>
			</section>

			<ol className="flex flex-col gap-6">
				{STEPS.map((step) => (
					<li
						key={step.number}
						className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6 sm:flex-row sm:items-start sm:gap-6 sm:p-8"
					>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
							{step.number}
						</div>
						<div className="flex flex-1 flex-col gap-2">
							<h2 className="m-0 text-xl font-semibold leading-tight text-text">
								{step.title}
							</h2>
							<p className="m-0 text-[0.95rem] leading-normal text-text-muted">
								{step.description}
							</p>
							<Link
								href={step.href}
								className="mt-2 self-start text-sm font-semibold text-accent no-underline hover:text-accent-hover hover:underline"
							>
								{step.cta}
							</Link>
						</div>
					</li>
				))}
			</ol>
		</main>
	);
}
