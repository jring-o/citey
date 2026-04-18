/**
 * Whitepaper content — structured sections for the "How to Cite Software" page.
 *
 * Each section has a heading and an array of paragraphs (HTML strings).
 * This avoids pulling in MDX/Markdown tooling and keeps the bundle lean.
 */

export interface WhitepaperSection {
	heading: string;
	paragraphs: string[];
}

export const WHITEPAPER_SECTIONS: WhitepaperSection[] = [
	{
		heading: "Why cite software",
		paragraphs: [
			"Software is a fundamental pillar of modern research. From climate models and genome assemblers to statistical packages and visualization libraries, software underpins virtually every scientific result published today. Yet software remains chronically under-cited in academic literature, depriving developers and maintainers of the recognition their work deserves.",
			"Citing software matters for several reasons. First, it provides <strong>credit and attribution</strong> to the people who create and maintain research tools. Many research software engineers work outside traditional academic career tracks; citations are one of the few metrics that make their contributions visible to funding bodies and hiring committees.",
			"Second, proper software citation improves <strong>reproducibility</strong>. When a paper cites the exact version of a package used in an analysis, other researchers can reconstruct the computational environment and verify results. Without version-specific citations, reproducing published work becomes guesswork.",
			"Third, citation data creates a <strong>dependency graph</strong> of the scientific record. Funders, institutions, and the community can see which tools are most impactful, which need sustained investment, and where gaps exist. This visibility helps allocate resources to the infrastructure that science depends on.",
			"The <em>FORCE11 Software Citation Principles</em> (Smith et al., 2016) established that software should be cited on the same basis as any other research output. Citey is an opinionated implementation of those principles &mdash; making the right thing easy.",
		],
	},
	{
		heading: "What to cite (and what not to cite)",
		paragraphs: [
			"The rule is simple: <strong>if removing the software would change your results or methodology, it should appear in your reference list.</strong>",
			"Cite the <strong>software itself</strong>, not a proxy paper about it. This is the central tension in software citation. Many maintainers ask researchers to cite a companion journal article instead of the software &mdash; e.g., a methods paper that describes the algorithm. FORCE11 disagrees, and so does Citey: <strong>cite what you actually used.</strong> If a paper meaningfully describes the methodology, that's a separate entry in your reference list, not a substitute for citing the artifact.",
			"Cite the <strong>specific version</strong> you used whenever possible. Software evolves rapidly; behaviour, APIs, and outputs can change between releases. A version-pinned citation lets readers know exactly which code produced your results. Where the package mints version-specific DOIs (e.g., via Zenodo), use the version DOI rather than the concept DOI.",
			"Always include a <strong>persistent identifier</strong>. A DOI minted through Zenodo, Figshare, or a similar archive ensures the reference remains resolvable even if the hosting platform changes. Repository URLs alone are fragile. Citey's database requires either a DOI or a stable URL on every entry.",
			"For large analyses that depend on many packages, consider citing the most critical tools in the main text and providing a full software environment description (e.g., a <code>requirements.txt</code> or <code>environment.yml</code>) as supplementary material.",
		],
	},
	{
		heading: "The Citey citation model",
		paragraphs: [
			"Citey enforces a single, opinionated shape for every citation in its database. There are no entry-type variations, no special cases for papers vs. software vs. datasets &mdash; just one model, applied uniformly.",
			"<strong>Required fields:</strong> <code>title</code> (the software's name), <code>authors</code> (one or more, with optional ORCID and affiliation), <code>year</code> (a 4-digit year), and at least one of <code>doi</code> or <code>url</code> (a resolvable pointer). <strong>Optional fields:</strong> <code>version</code>, <code>publisher</code> (e.g., Zenodo, GitHub, JOSS).",
			"What's deliberately <strong>excluded</strong>: there is no entry type (everything is a software citation), no <code>journal</code> / <code>booktitle</code> / <code>volume</code> / <code>issue</code> / <code>pages</code> (those describe papers), and no &ldquo;preferred citation&rdquo; redirect to a companion article. This makes Citey narrower than CFF or codemeta, which both support pointing at a paper instead of the software. Citey ignores those redirects on principle.",
			"From this single model, Citey produces every output format users actually consume: <strong>BibTeX</strong> as <code>@software{}</code> entries, <strong>plain text</strong> in an APA-flavored style, and <strong>Zotero HTML</strong> for clipboard-driven imports. The researcher picks the format in the extension's options; the underlying citation data is the same.",
			"This means Citey&rsquo;s output is opinionated. If a maintainer's preferred citation points at a methods paper, Citey will still emit a citation for the software itself. Researchers who want to cite the paper too can do so manually &mdash; the software citation doesn't preclude it.",
		],
	},
	{
		heading: "CFF, codemeta, and BibTeX in this workflow",
		paragraphs: [
			"Three standards show up in software citation, each playing a different role in Citey's pipeline.",
			"<strong>Citation File Format (CFF)</strong> is a YAML file (<code>CITATION.cff</code>) placed at the root of a repository. It's how software <strong>authors publish</strong> their citation metadata in a machine-readable form. GitHub renders a &ldquo;Cite this repository&rdquo; button when one is present. CFF supports authors, version, DOI, license, keywords, and a preferred-citation block. The hub provides a <a href=\"/cff\">CFF generator</a>; output it, commit it to your repo.",
			"<strong>CodeMeta</strong> is a JSON-LD file (<code>codemeta.json</code>) for richer software metadata: programming language, operating systems, software requirements, funding sources, and more. While CFF focuses on citation, codemeta is what software registries (Software Heritage, JOSS) consume for indexing. The hub also provides a <a href=\"/codemeta\">codemeta generator</a>.",
			"<strong>BibTeX</strong> is the format researchers consume in LaTeX-based workflows (<code>.bib</code> files). Citey emits BibTeX <code>@software{}</code> entries built from its internal model.",
			"In Citey's pipeline, CFF and codemeta are <strong>inputs</strong>: when you add a package via <a href=\"/packages\">/packages</a>, Citey fetches your repo's CFF and codemeta files, extracts the fields it needs, and stores them in the canonical Citey model. BibTeX (and plain text and Zotero HTML) are <strong>outputs</strong>: what the extension hands a researcher when they look up your software. The internal Citey model is the bridge.",
			"As a software author, the recommended workflow is: (1) generate <code>CITATION.cff</code> using the <a href=\"/cff\">hub generator</a> and commit it to your repo; (2) generate <code>codemeta.json</code> the same way; (3) mint a DOI via Zenodo or similar so your software has a persistent identifier; (4) <a href=\"/packages\">add your repo to Citey</a> &mdash; one URL, one pull request, citation lookups available to every researcher who installs the extension.",
		],
	},
	{
		heading: "References",
		paragraphs: [
			'Smith, A. M., Katz, D. S., Niemeyer, K. E., & FORCE11 Software Citation Working Group. (2016). Software citation principles. <em>PeerJ Computer Science</em>, 2, e86. <a href="https://doi.org/10.7717/peerj-cs.86" target="_blank" rel="noopener">https://doi.org/10.7717/peerj-cs.86</a>',
			'Druskat, S., Spaaks, J. H., Chue Hong, N., Haines, R., Baker, J., Bliven, S., ... & Willighagen, E. (2021). Citation File Format (CFF). <a href="https://doi.org/10.5281/zenodo.1003149" target="_blank" rel="noopener">https://doi.org/10.5281/zenodo.1003149</a>',
			'Jones, M. B., Boettiger, C., Mayes, A. C., Slaughter, P., Niemeyer, K., Gil, Y., ... & Harmon, T. (2017). CodeMeta: an exchange schema for software metadata, version 2.0. <a href="https://doi.org/10.5063/schema/codemeta-2.0" target="_blank" rel="noopener">https://doi.org/10.5063/schema/codemeta-2.0</a>',
			'Chue Hong, N. P., Katz, D. S., Barker, M., Lamprecht, A.-L., Martinez, C., Psomopoulos, F. E., ... & Wueest, R. O. (2022). FAIR Principles for Research Software (FAIR4RS Principles). <em>Scientific Data</em>, 9, 622. <a href="https://doi.org/10.1038/s41597-022-01710-x" target="_blank" rel="noopener">https://doi.org/10.1038/s41597-022-01710-x</a>',
			'Katz, D. S., Chue Hong, N. P., Clark, T., Muench, A., Stall, S., Bouquin, D., ... & Yeston, J. (2021). Recognizing the value of software: a software citation guide. <em>F1000Research</em>, 9, 1257. <a href="https://doi.org/10.12688/f1000research.26932.2" target="_blank" rel="noopener">https://doi.org/10.12688/f1000research.26932.2</a>',
		],
	},
];
