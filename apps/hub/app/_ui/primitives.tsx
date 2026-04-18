"use client";

import type {
	ButtonHTMLAttributes,
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";

const fieldBase =
	"w-full rounded-md border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1";
const fieldOk = "border-border focus:border-accent focus:ring-accent";
const fieldErr = "border-red-500 focus:border-red-500 focus:ring-red-500";

export function Field({
	htmlFor,
	label,
	error,
	children,
}: {
	htmlFor: string;
	label: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label
				htmlFor={htmlFor}
				className="text-sm font-medium text-text"
			>
				{label}
			</label>
			{children}
			{error && (
				<p className="text-xs text-red-600" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
	error?: string;
}

export function TextInput({ error, className = "", ...rest }: TextInputProps) {
	return (
		<input
			type="text"
			className={`${fieldBase} ${error ? fieldErr : fieldOk} ${className}`}
			{...rest}
		/>
	);
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	error?: string;
}

export function TextArea({ error, className = "", ...rest }: TextAreaProps) {
	return (
		<textarea
			className={`${fieldBase} ${error ? fieldErr : fieldOk} ${className}`}
			{...rest}
		/>
	);
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	error?: string;
}

export function Select({
	error,
	className = "",
	children,
	...rest
}: SelectProps) {
	return (
		<select
			className={`${fieldBase} ${error ? fieldErr : fieldOk} ${className}`}
			{...rest}
		>
			{children}
		</select>
	);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost";
}

export function Button({
	variant = "primary",
	className = "",
	type = "button",
	children,
	...rest
}: ButtonProps) {
	const styles: Record<string, string> = {
		primary:
			"bg-accent text-white hover:bg-accent-hover border border-transparent",
		secondary:
			"bg-surface text-accent border border-accent hover:bg-accent/10",
		ghost: "bg-transparent text-text-muted hover:text-text hover:bg-border/50",
	};
	return (
		<button
			type={type}
			className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
			{...rest}
		>
			{children}
		</button>
	);
}

export function Banner({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-text">
			{children}
		</div>
	);
}
