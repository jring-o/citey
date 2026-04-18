import type { Metadata } from "next";
import { WHITEPAPER_SECTIONS } from "@/lib/whitepaper";

export const metadata: Metadata = {
	title: "How to Cite Software — Citey",
	description:
		"A guide to making research software citable: why it matters, what to cite, and which standards to use.",
};

export default function Whitepaper() {
	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<h1 className="mb-3 text-4xl font-bold leading-tight tracking-tight text-text sm:text-5xl">
				How to Cite Software
			</h1>
			<p className="mb-12 max-w-prose text-lg leading-relaxed text-text-muted">
				A comprehensive guide to making research software citable &mdash;
				covering why it matters, what to cite, which standards to use, and the
				tools that make it easy.
			</p>

			{WHITEPAPER_SECTIONS.map((section) => (
				<section key={section.heading} className="mb-10">
					<h2 className="mb-5 border-b-2 border-border pb-2 text-2xl font-semibold leading-tight tracking-tight text-accent">
						{section.heading}
					</h2>
					{section.paragraphs.map((html, i) => (
						<p
							key={i}
							className="mb-4 max-w-prose text-base leading-loose text-text-muted [&_a]:text-accent [&_a:hover]:text-accent-hover [&_a:hover]:underline [&_code]:rounded [&_code]:bg-code-bg [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em] [&_strong]:font-semibold [&_strong]:text-text"
							dangerouslySetInnerHTML={{ __html: html }}
						/>
					))}
				</section>
			))}
		</main>
	);
}
