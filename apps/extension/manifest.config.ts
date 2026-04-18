import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";

const { version } = packageJson;

export default defineManifest({
  manifest_version: 3,
  name: "Citey",
  version,
  description: "Spellcheck, but for software citations.",
  icons: {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png",
  },
  action: {
    default_popup: "index.html",
    default_title: "Citey \u2014 cite the software you highlighted",
  },
  options_ui: {
    page: "options.html",
    open_in_tab: true,
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  permissions: [
    "activeTab",
    "scripting",
    "clipboardWrite",
    "storage",
    "contextMenus",
  ],
  // host_permissions:
  //   - api.citeas.org for the online fallback
  //   - file:///* lets users opt in (via chrome://extensions → "Allow access
  //     to file URLs") to selecting text from PDFs they open locally
  host_permissions: ["https://api.citeas.org/*", "file:///*"],
});
