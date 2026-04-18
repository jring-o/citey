"use client";

import { useCallback, useState } from "react";

export interface AuthorFormState {
	family: string;
	given: string;
	email: string;
	affiliation: string;
	orcid: string;
}

export function emptyAuthor(): AuthorFormState {
	return { family: "", given: "", email: "", affiliation: "", orcid: "" };
}

export interface FundingReferenceFormState {
	funderName: string;
	awardNumber: string;
	awardTitle: string;
}

export function emptyFundingReference(): FundingReferenceFormState {
	return { funderName: "", awardNumber: "", awardTitle: "" };
}

export interface CodemetaFormState {
	name: string;
	description: string;
	codeRepository: string;
	url: string;
	dateCreated: string;
	dateModified: string;
	license: string;
	version: string;
	authors: AuthorFormState[];
	programmingLanguage: string;
	keywords: string;
	identifier: string;

	applicationCategory: string;
	operatingSystem: string;
	softwareRequirements: string;
	funding: string;
	fundingReferences: FundingReferenceFormState[];
	developmentStatus: string;
	referencePublication: string;

	advancedOpen: boolean;
}

export function initialCodemetaFormState(): CodemetaFormState {
	return {
		name: "",
		description: "",
		codeRepository: "",
		url: "",
		dateCreated: "",
		dateModified: "",
		license: "",
		version: "",
		authors: [emptyAuthor()],
		programmingLanguage: "",
		keywords: "",
		identifier: "",

		applicationCategory: "",
		operatingSystem: "",
		softwareRequirements: "",
		funding: "",
		fundingReferences: [],
		developmentStatus: "",
		referencePublication: "",

		advancedOpen: false,
	};
}

export function useCodemetaForm() {
	const [state, setState] = useState<CodemetaFormState>(
		initialCodemetaFormState,
	);

	const setField = useCallback(
		<K extends keyof CodemetaFormState>(
			key: K,
			value: CodemetaFormState[K],
		) => {
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

	const setFundingReference = useCallback(
		(index: number, ref: FundingReferenceFormState) => {
			setState((prev) => {
				const fundingReferences = [...prev.fundingReferences];
				fundingReferences[index] = ref;
				return { ...prev, fundingReferences };
			});
		},
		[],
	);

	const addFundingReference = useCallback(() => {
		setState((prev) => ({
			...prev,
			fundingReferences: [...prev.fundingReferences, emptyFundingReference()],
		}));
	}, []);

	const removeFundingReference = useCallback((index: number) => {
		setState((prev) => ({
			...prev,
			fundingReferences: prev.fundingReferences.filter((_, i) => i !== index),
		}));
	}, []);

	return {
		state,
		setField,
		toggleAdvanced,
		setAuthor,
		addAuthor,
		removeAuthor,
		setFundingReference,
		addFundingReference,
		removeFundingReference,
	};
}
