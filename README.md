# Citey

Citey is a Chrome (Manifest V3) browser extension that turns software citation from a manual chore into a single-button action. A researcher highlights text on any web page, clicks the Citey toolbar icon, and immediately sees export-ready citations for any software named in the selection.

## Install

### Chrome Web Store

_Coming soon._ The Chrome Web Store link will be added here once the extension is published.

### Install from source

```bash
git clone https://github.com/jring-o/citey.git
cd citey
pnpm install --frozen-lockfile
pnpm build
```

Then load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `apps/extension/dist/` directory.

## Develop

```bash
# Install dependencies
pnpm install

# Start development (db-build watcher + Vite extension dev)
pnpm dev

# Start the hub dev server
pnpm dev:hub
```

## Contribute a package

Citey ships with a curated database of software packages. The fastest way to add yours is the hub:

### From the hub (recommended — no local clone needed)

Anyone with a GitHub account can contribute a package straight from <https://citey.scios.tech/packages>:

1. **Make sure your repo has both `CITATION.cff` and `codemeta.json` at its root.** Don't have them yet? Generate them in your browser:
   - <https://citey.scios.tech/cff> — produces a downloadable `CITATION.cff`
   - <https://citey.scios.tech/codemeta> — produces a downloadable `codemeta.json`
   - Commit both files to your repo.
2. Go to <https://citey.scios.tech/packages> → click **+ Add package**.
3. Paste your GitHub repo URL → **Submit**.
4. Citey reads your `CITATION.cff` and `codemeta.json`, builds a citation in our model, and opens a prefilled pull request against this repo. GitHub forks the repo for you if needed.
5. CI validates the schema. A maintainer reviews and merges.

That's the whole flow — paste a URL, click submit, the PR is opened for you. The hub at <https://citey.scios.tech> walks through it as a numbered checklist on the landing page.

Citey enforces an opinionated software-citation model (per [FORCE11](https://doi.org/10.7717/peerj-cs.86)): every entry needs a title, ≥1 author, a 4-digit year, and either a DOI or a stable URL. See the [whitepaper](https://citey.scios.tech/whitepaper) for the full rationale.

### Manually via PR

If you'd rather edit YAML directly:

1. Choose the ecosystem (`pypi`, `cran`, `npm`, `julia`, or `generic`).
2. Copy `data/seed/_template.yaml` to `data/seed/{ecosystem}/{your-package-id}.yaml`.
3. Fill in the required fields. The template documents the schema.
4. Run `pnpm --filter db-build build` to validate and regenerate `db.json`.
5. Open a pull request.

## License

[MIT](./LICENSE)
