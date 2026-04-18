import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Citey — Make your software citable",
	description:
		"Citey is a browser extension and toolkit that turns software citation into a single-button action. Generate standards-compliant citation files entirely in your browser.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
