"use client";

import { useCallback, useState } from "react";

export interface AuthorFormState {
	family: string;
	given: string;
	orcid: string;
	affiliation: string;
	kind: "person" | "organization";
}

export function emptyAuthor(): AuthorFormState {
	return { family: "", given: "", orcid: "", affiliation: "", kind: "person" };
}

export interface IdentifierFormState {
	type: string;
	value: string;
	description: string;
}

export function emptyIdentifier(): IdentifierFormState {
	return { type: "doi", value: "", description: "" };
}

export interface PreferredCitationFormState {
	type: string;
	title: string;
	authors: AuthorFormState[];
	doi: string;
	journal: string;
	volume: string;
	issue: string;
	year: string;
	start: string;
	end: string;
	url: string;
}

export function emptyPreferredCitation(): PreferredCitationFormState {
	return {
		type: "article",
		title: "",
		authors: [emptyAuthor()],
		doi: "",
		journal: "",
		volume: "",
		issue: "",
		year: "",
		start: "",
		end: "",
		url: "",
	};
}

export interface CffFormState {
	title: string;
	message: string;
	version: string;
	dateReleased: string;
	authors: AuthorFormState[];
	repositoryCode: string;
	url: string;
	license: string;
	keywords: string;
	doi: string;

	abstract: string;
	type: "software" | "dataset";
	identifiers: IdentifierFormState[];
	preferredCitation: PreferredCitationFormState;

	advancedOpen: boolean;
}

export function initialCffFormState(): CffFormState {
	return {
		title: "",
		message:
			"If you use this software, please cite it using the metadata from this file.",
		version: "",
		dateReleased: "",
		authors: [emptyAuthor()],
		repositoryCode: "",
		url: "",
		license: "",
		keywords: "",
		doi: "",

		abstract: "",
		type: "software",
		identifiers: [],
		preferredCitation: emptyPreferredCitation(),

		advancedOpen: false,
	};
}

export type PopulatePayload = {
	title?: string;
	version?: string;
	dateReleased?: string;
	repositoryCode?: string;
	url?: string;
	license?: string;
	keywords?: string;
	abstract?: string;
	authors?: AuthorFormState[];
};

export function useCffForm() {
	const [state, setState] = useState<CffFormState>(initialCffFormState);

	const setField = useCallback(
		<K extends keyof CffFormState>(key: K, value: CffFormState[K]) => {
			setState((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const toggleAdvanced = useCallback(() => {
		setState((prev) => ({ ...prev, advancedOpen: !prev.advancedOpen }));
	}, []);

	const setAuthor = useCallback((index: number, author: AuthorFormState) => {
		setState((prev) => {
			const authors = [...prev.authors];
			authors[index] = author;
			return { ...prev, authors };
		});
	}, []);

	const addAuthor = useCallback(() => {
		setState((prev) => ({
			...prev,
			authors: [...prev.authors, emptyAuthor()],
		}));
	}, []);

	const removeAuthor = useCallback((index: number) => {
		setState((prev) => ({
			...prev,
			authors: prev.authors.filter((_, i) => i !== index),
		}));
	}, []);

	const setIdentifier = useCallback(
		(index: number, id: IdentifierFormState) => {
			setState((prev) => {
				const identifiers = [...prev.identifiers];
				identifiers[index] = id;
				return { ...prev, identifiers };
			});
		},
		[],
	);

	const addIdentifier = useCallback(() => {
		setState((prev) => ({
			...prev,
			identifiers: [...prev.identifiers, emptyIdentifier()],
		}));
	}, []);

	const removeIdentifier = useCallback((index: number) => {
		setState((prev) => ({
			...prev,
			identifiers: prev.identifiers.filter((_, i) => i !== index),
		}));
	}, []);

	const setPreferredCitation = useCallback(
		(pc: PreferredCitationFormState) => {
			setState((prev) => ({ ...prev, preferredCitation: pc }));
		},
		[],
	);

	const setPcAuthor = useCallback((index: number, author: AuthorFormState) => {
		setState((prev) => {
			const authors = [...prev.preferredCitation.authors];
			authors[index] = author;
			return {
				...prev,
				preferredCitation: { ...prev.preferredCitation, authors },
			};
		});
	}, []);

	const addPcAuthor = useCallback(() => {
		setState((prev) => ({
			...prev,
			preferredCitation: {
				...prev.preferredCitation,
				authors: [...prev.preferredCitation.authors, emptyAuthor()],
			},
		}));
	}, []);

	const removePcAuthor = useCallback((index: number) => {
		setState((prev) => ({
			...prev,
			preferredCitation: {
				...prev.preferredCitation,
				authors: prev.preferredCitation.authors.filter((_, i) => i !== index),
			},
		}));
	}, []);

	const populateFromExtract = useCallback((payload: PopulatePayload) => {
		setState((prev) => ({
			...prev,
			...payload,
			advancedOpen:
				prev.advancedOpen ||
				(typeof payload.abstract === "string" && payload.abstract.trim() !== ""),
		}));
	}, []);

	return {
		state,
		setField,
		toggleAdvanced,
		setAuthor,
		addAuthor,
		removeAuthor,
		setIdentifier,
		addIdentifier,
		removeIdentifier,
		setPreferredCitation,
		setPcAuthor,
		addPcAuthor,
		removePcAuthor,
		populateFromExtract,
	};
}
