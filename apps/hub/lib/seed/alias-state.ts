"use client";

import { useCallback, useState } from "react";
import type { Ecosystem } from "./state";

export interface AliasFormState {
	canonicalName: string;
	parentId: string;
	ecosystem: Ecosystem;
	description: string;
	contributorName: string;
}

export function initialAliasFormState(): AliasFormState {
	return {
		canonicalName: "",
		parentId: "",
		ecosystem: "pypi",
		description: "",
		contributorName: "",
	};
}

export function useAliasForm() {
	const [state, setState] = useState<AliasFormState>(initialAliasFormState);

	const setField = useCallback(
		<K extends keyof AliasFormState>(key: K, value: AliasFormState[K]) => {
			setState((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const reset = useCallback(() => {
		setState(initialAliasFormState());
	}, []);

	return { state, setField, reset };
}
