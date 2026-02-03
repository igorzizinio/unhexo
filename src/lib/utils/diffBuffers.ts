/**
 * Legacy function - compares two full Uint8Arrays in memory
 * @deprecated Use diffWithChangeSet for memory-efficient comparison
 */
export function diffBuffers(a: Uint8Array, b: Uint8Array): Set<number> {
	const diffs = new Set<number>();
	const len = Math.min(a.length, b.length);

	for (let i = 0; i < len; i++) {
		if (a[i] !== b[i]) diffs.add(i);
	}

	for (let i = len; i < Math.max(a.length, b.length); i++) {
		diffs.add(i);
	}

	return diffs;
}

/**
 * Memory-efficient diff algorithm that compares files using change sets
 * instead of loading entire files into memory.
 *
 * @param leftFileSize - Size of the left file in bytes
 * @param leftChangeSet - Record of changes (byte index -> new value) for left file
 * @param rightFileSize - Size of the right file in bytes
 * @param rightChangeSet - Record of changes (byte index -> new value) for right file
 * @param readLeftByte - Function to read a byte from left file at given offset
 * @param readRightByte - Function to read a byte from right file at given offset
 * @returns Set of byte indices where files differ
 */
export async function diffWithChangeSet(
	leftFileSize: number,
	leftChangeSet: Record<number, number>,
	rightFileSize: number,
	rightChangeSet: Record<number, number>,
	readLeftByte: (offset: number) => Promise<number>,
	readRightByte: (offset: number) => Promise<number>,
): Promise<Set<number>> {
	const diffs = new Set<number>();
	const maxSize = Math.max(leftFileSize, rightFileSize);

	// Compare byte by byte, using changeSet overrides when present
	for (let i = 0; i < maxSize; i++) {
		let leftValue: number;
		let rightValue: number;

		// Get left byte value (from changeSet or file)
		if (i in leftChangeSet) {
			leftValue = leftChangeSet[i];
		} else if (i < leftFileSize) {
			leftValue = await readLeftByte(i);
		} else {
			// Beyond file size
			leftValue = -1;
		}

		// Get right byte value (from changeSet or file)
		if (i in rightChangeSet) {
			rightValue = rightChangeSet[i];
		} else if (i < rightFileSize) {
			rightValue = await readRightByte(i);
		} else {
			// Beyond file size
			rightValue = -1;
		}

		// Mark difference
		if (leftValue !== rightValue) {
			diffs.add(i);
		}
	}

	return diffs;
}

/**
 * Optimized diff algorithm that reads chunks of data instead of individual bytes.
 * Much faster for large files.
 *
 * @param readLeftBytes - Function to read multiple bytes from left file
 * @param leftChangeSet - Record of changes (byte index -> new value) for left file
 * @param readRightBytes - Function to read multiple bytes from right file
 * @param rightChangeSet - Record of changes (byte index -> new value) for right file
 * @param fileSize - Size of the files in bytes
 * @param chunkSize - Size of chunks to read (default: 64KB)
 * @returns Set of byte indices where files differ
 */
export async function diffWithChangeSetChunked(
	readLeftBytes: (offset: number, length: number) => Promise<Uint8Array>,
	leftChangeSet: Record<number, number>,
	readRightBytes: (offset: number, length: number) => Promise<Uint8Array>,
	rightChangeSet: Record<number, number>,
	fileSize: number,
	chunkSize = 64 * 1024, // 64KB default
): Promise<Set<number>> {
	const diffs = new Set<number>();

	// Process file in chunks
	for (let chunkStart = 0; chunkStart < fileSize; chunkStart += chunkSize) {
		const currentChunkSize = Math.min(chunkSize, fileSize - chunkStart);

		// Read both chunks in parallel
		const [leftChunk, rightChunk] = await Promise.all([
			chunkStart < fileSize
				? readLeftBytes(chunkStart, currentChunkSize)
				: new Uint8Array(0),
			chunkStart < fileSize
				? readRightBytes(chunkStart, currentChunkSize)
				: Promise.resolve(new Uint8Array(0)),
		]);

		// Compare bytes in this chunk
		for (let i = 0; i < currentChunkSize; i++) {
			const globalOffset = chunkStart + i;
			let leftValue: number;
			let rightValue: number;

			// Get left byte value (from changeSet or chunk)
			if (globalOffset in leftChangeSet) {
				leftValue = leftChangeSet[globalOffset];
			} else if (i < leftChunk.length) {
				leftValue = leftChunk[i];
			} else {
				leftValue = -1; // Beyond file
			}

			// Get right byte value (from changeSet or chunk)
			if (globalOffset in rightChangeSet) {
				rightValue = rightChangeSet[globalOffset];
			} else if (i < rightChunk.length) {
				rightValue = rightChunk[i];
			} else {
				rightValue = -1; // Beyond file
			}

			// Mark difference
			if (leftValue !== rightValue) {
				diffs.add(globalOffset);
			}
		}
	}

	return diffs;
}

/**
 * Fast diff that only checks bytes in the change sets and their surrounding regions.
 * Most efficient when only a small portion of the files have been modified.
 *
 * @param readLeftBytes - Function to read multiple bytes from left file
 * @param leftChangeSet - Record of changes (byte index -> new value) for left file
 * @param readRightBytes - Function to read multiple bytes from right file
 * @param rightChangeSet - Record of changes (byte index -> new value) for right file
 * @param fileSize - Size of the files in bytes
 * @returns Set of byte indices where files differ
 */
export async function diffChangeSetsOnly(
	readLeftBytes: (offset: number, length: number) => Promise<Uint8Array>,
	leftChangeSet: Record<number, number>,
	readRightBytes: (offset: number, length: number) => Promise<Uint8Array>,
	rightChangeSet: Record<number, number>,
	fileSize: number,
): Promise<Set<number>> {
	const diffs = new Set<number>();

	// Collect all indices that have changes in either file
	const allChangedIndices = new Set<number>();
	for (const idx of Object.keys(leftChangeSet).map(Number)) {
		allChangedIndices.add(idx);
	}
	for (const idx of Object.keys(rightChangeSet).map(Number)) {
		allChangedIndices.add(idx);
	}

	// If no changes, files are identical
	if (allChangedIndices.size === 0) {
		return diffs;
	}

	// Check each changed index
	for (const idx of allChangedIndices) {
		let leftValue: number;
		let rightValue: number;

		// Get left byte value
		if (idx in leftChangeSet) {
			leftValue = leftChangeSet[idx];
		} else if (idx < fileSize) {
			// Need to read from file
			const chunk = await readLeftBytes(idx, 1);
			leftValue = chunk.length > 0 ? chunk[0] : -1;
		} else {
			leftValue = -1;
		}

		// Get right value
		if (idx in rightChangeSet) {
			rightValue = rightChangeSet[idx];
		} else if (idx < fileSize) {
			// Need to read from file
			const chunk = await readRightBytes(idx, 1);
			rightValue = chunk.length > 0 ? chunk[0] : -1;
		} else {
			rightValue = -1;
		}

		if (leftValue !== rightValue) {
			diffs.add(idx);
		}
	}

	return diffs;
}
