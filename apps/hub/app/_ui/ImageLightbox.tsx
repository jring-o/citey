"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
	src: string;
	alt: string;
	width: number;
	height: number;
	caption: string;
	priority?: boolean;
};

export function ImageLightbox({
	src,
	alt,
	width,
	height,
	caption,
	priority,
}: Props) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<figure className="m-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-label={`Open "${alt}" at full size`}
				className="group relative block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
			>
				<Image
					src={src}
					alt={alt}
					width={width}
					height={height}
					className="h-auto w-full transition-opacity group-hover:opacity-90"
					sizes="(min-width: 640px) 50vw, 100vw"
					priority={priority}
				/>
				<span className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
					Click to enlarge
				</span>
			</button>
			<figcaption className="border-t border-border px-4 py-3 text-sm text-text-muted">
				{caption}
			</figcaption>

			{open && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label={alt}
					onClick={() => setOpen(false)}
					className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4 sm:p-8"
				>
					<button
						type="button"
						onClick={() => setOpen(false)}
						aria-label="Close"
						className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
					>
						Close ✕
					</button>
					<div
						onClick={(e) => e.stopPropagation()}
						className="relative flex max-h-full max-w-7xl flex-col items-center"
					>
						<Image
							src={src}
							alt={alt}
							width={width}
							height={height}
							sizes="100vw"
							className="h-auto max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
							priority
						/>
						<p className="mt-3 text-center text-sm text-white/80">{caption}</p>
					</div>
				</div>
			)}
		</figure>
	);
}
