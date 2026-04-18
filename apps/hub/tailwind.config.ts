import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./lib/**/*.{js,ts,jsx,tsx,mdx}",
	],
	darkMode: "media",
	theme: {
		extend: {
			colors: {
				bg: "var(--color-bg)",
				surface: "var(--color-surface)",
				text: "var(--color-text)",
				"text-muted": "var(--color-text-muted)",
				accent: "var(--color-accent)",
				"accent-hover": "var(--color-accent-hover)",
				border: "var(--color-border)",
				"code-bg": "var(--color-code-bg)",
			},
			fontFamily: {
				sans: ["var(--font-sans)"],
				mono: ["var(--font-mono)"],
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};

export default config;
