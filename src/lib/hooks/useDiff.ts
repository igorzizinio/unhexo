import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { Tab } from "../context/FileContext";

/**
 * Hook to compute differences between two file tabs in a specific range.
 * This only diffs the visible portion, making it fast even for large files.
 */
export function useDiffInRange(
	leftTab: Tab | null,
	rightTab: Tab | null,
	offset: number,
	length: number,
): Set<number> | null {
	const [diffSet, setDiffSet] = useState<Set<number> | null>(null);

	useEffect(() => {
		if (!leftTab || !rightTab) {
			setDiffSet(null);
			return;
		}

		if (!leftTab.filePath || !rightTab.filePath) {
			setDiffSet(null);
			return;
		}

		let cancelled = false;

		const computeDiff = async () => {
			try {
				// Ensure both file handles are open in Rust
				await invoke("open_file_handle", { path: leftTab.filePath });
				await invoke("open_file_handle", { path: rightTab.filePath });

				// Call the Rust diff_in_range command for only the visible range
				const differences = await invoke<number[]>("diff_in_range", {
					pathLeft: leftTab.filePath,
					pathRight: rightTab.filePath,
					offset,
					length,
				});

				if (!cancelled) {
					const result = new Set(differences);
					setDiffSet(result);
				}
			} catch (error) {
				console.error("Error computing diff:", error);
				if (!cancelled) {
					setDiffSet(null);
				}
			}
		};

		computeDiff();

		return () => {
			cancelled = true;
		};
	}, [
		leftTab?.id,
		leftTab?.filePath,
		rightTab?.id,
		rightTab?.filePath,
		offset,
		length,
	]);

	return diffSet;
}

/**
 * Hook that provides diff navigation functions
 */
export function useDiffNavigation(leftTab: Tab | null, rightTab: Tab | null) {
	const [isSearching, setIsSearching] = useState(false);

	const findNextDiff = useCallback(
		async (fromOffset: number): Promise<number | null> => {
			if (!leftTab?.filePath || !rightTab?.filePath) {
				return null;
			}

			setIsSearching(true);
			try {
				// Ensure both file handles are open
				await invoke("open_file_handle", { path: leftTab.filePath });
				await invoke("open_file_handle", { path: rightTab.filePath });

				const result = await invoke<number | null>("find_next_diff", {
					pathLeft: leftTab.filePath,
					pathRight: rightTab.filePath,
					fromOffset,
				});

				return result;
			} catch (error) {
				console.error("Error finding next diff:", error);
				return null;
			} finally {
				setIsSearching(false);
			}
		},
		[leftTab?.filePath, rightTab?.filePath],
	);

	const findPrevDiff = useCallback(
		async (fromOffset: number): Promise<number | null> => {
			if (!leftTab?.filePath || !rightTab?.filePath) {
				return null;
			}

			setIsSearching(true);
			try {
				// Ensure both file handles are open
				await invoke("open_file_handle", { path: leftTab.filePath });
				await invoke("open_file_handle", { path: rightTab.filePath });

				const result = await invoke<number | null>("find_prev_diff", {
					pathLeft: leftTab.filePath,
					pathRight: rightTab.filePath,
					fromOffset,
				});

				return result;
			} catch (error) {
				console.error("Error finding previous diff:", error);
				return null;
			} finally {
				setIsSearching(false);
			}
		},
		[leftTab?.filePath, rightTab?.filePath],
	);

	return {
		findNextDiff,
		findPrevDiff,
		isSearching,
	};
}
