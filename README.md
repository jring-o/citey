# Citey

Citey is a Chrome (Manifest V3) browser extension that turns software citation from a manual chore into a single-button action. A researcher highlights text on any web page, clicks the Citey toolbar icon, and immediately sees export-ready citations for any software named in the selection.

## Install

### Chrome Web Store

_Coming soon._ The Chrome Web Store link will be added here once the extension is published.

### Install from source

```bash
git clone https://github.com/scios-tech/citey.git
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

Citey ships with a curated seed database of software packages. You can contribute new entries via the hub at <https://citey.scios.tech> or by opening a pull request directly.

To add a package manually:

1. Choose the ecosystem the package belongs to (e.g. `python`, `r`, `julia`).
2. Create a new YAML file in `data/seed/{ecosystem}/` named after the package (e.g. `data/seed/python/my-package.yaml`).
3. Fill in the required fields following the schema used by existing seed files in that directory.
4. Run `pnpm build` to validate the entry and rebuild the database.
5. Open a pull request with your addition.

## License

[MIT](./LICENSE)
