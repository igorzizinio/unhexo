import type { SetStateAction } from "preact/compat";
import { type Dispatch, useEffect, useState } from "preact/hooks";

export function usePersistedState<T>(
	key: string,
	defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
	const [state, setState] = useState<T>(() => {
		const storedValue = localStorage.getItem(key);
		return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
	});

	useEffect(() => {
		localStorage.setItem(key, JSON.stringify(state));
	}, [key, state]);

	return [state, setState];
}
