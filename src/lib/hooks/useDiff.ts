import { useEffect, useState } from "preact/hooks";
import type { Tab } from "../context/FileContext";
import {
	diffChangeSetsOnly,
	diffWithChangeSetChunked,
} from "../utils/diffBuffers";
import { useFileBuffer } from "./useFileBuffer";

interface DiffHookOptions {
	/**
	 * Strategy for computing diffs:
	 * - "full": Compare entire files chunk by chunk (slower but thorough)
	 * - "changeset": Only compare changed regions (faster for sparse edits)
	 */
	strategy?: "full" | "changeset";

	/**
	 * Size of chunks to read when comparing files (default: 64KB)
	 */
	chunkSize?: number;
}

/**
 * Hook to compute differences between two file tabs using the new changeset-based architecture.
 * This avoids loading entire files into memory.
 */
export function useDiff(
	leftTab: Tab | null,
	rightTab: Tab | null,
	options: DiffHookOptions = {},
): Set<number> | null {
	const { strategy = "changeset", chunkSize = 64 * 1024 } = options;

	const [diffSet, setDiffSet] = useState<Set<number> | null>(null);

	const leftBuffer = useFileBuffer();
	const rightBuffer = useFileBuffer();

	useEffect(() => {
		if (!leftTab || !rightTab) {
			setDiffSet(null);
			return;
		}

		let cancelled = false;

		const computeDiff = async () => {
			try {
				// Open file handles
				if (!leftTab.filePath || !rightTab.filePath) {
					if (!cancelled) {
						setDiffSet(null);
					}
					return;
				}

				await leftBuffer.openFile(leftTab.filePath);
				await rightBuffer.openFile(rightTab.filePath);

				// Buffers are ready after opening (openFile is async)
				console.log(
					"Computing diff with strategy:",
					strategy,
					"Left changeSet:",
					leftTab.changeSet,
					"Right changeSet:",
					rightTab.changeSet,
				);

				let result: Set<number>;

				if (strategy === "changeset") {
					// Fast diff - only check changed regions
					result = await diffChangeSetsOnly(
						(offset, length) => leftBuffer.readBytes(offset, length),
						leftTab.changeSet,
						(offset, length) => rightBuffer.readBytes(offset, length),
						rightTab.changeSet,
						leftTab.fileSize,
					);
				} else {
					// Full diff - compare all bytes
					result = await diffWithChangeSetChunked(
						(offset, length) => leftBuffer.readBytes(offset, length),
						leftTab.changeSet,
						(offset, length) => rightBuffer.readBytes(offset, length),
						rightTab.changeSet,
						leftTab.fileSize,
						chunkSize,
					);
				}

				if (!cancelled) {
					console.log("Diff computed, found differences:", result.size);
					setDiffSet(result);
				}
			} catch (error) {
				console.error("Error computing diff:", error);
				if (!cancelled) {
					setDiffSet(null);
				}
			} finally {
				// Cleanup if needed
			}
		};

		computeDiff();

		return () => {
			cancelled = true;
			// Cleanup file handles
			leftBuffer.closeFile();
			rightBuffer.closeFile();
		};
	}, [
		leftTab?.id,
		leftTab?.fileSize,
		leftTab?.changeSet,
		rightTab?.id,
		rightTab?.fileSize,
		rightTab?.changeSet,
		strategy,
		chunkSize,
	]);

	return diffSet;
}
