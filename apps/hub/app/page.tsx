import Link from "next/link";

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
			"Why software citation matters, what to cite, and which standards Citey enforces. Skim it once — five minutes.",
		href: "/whitepaper",
		cta: "Read the guide →",
	},
	{
		number: 2,
		title: "Generate a CITATION.cff for your repo",
		description:
			"Create the standard Citation File Format file. GitHub renders a “Cite this repository” button when this file is present at the root of your repo.",
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
				<h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-text sm:text-5xl">
					Make your software citable in 5 minutes
				</h1>
				<p className="mx-auto max-w-prose text-lg leading-relaxed text-text-muted">
					Citey is a browser extension and toolkit that turns software citation
					into a single-button action for researchers. Get your software into
					the database in four steps.
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
