/**
 * Utility functions for working with file changeSets in the new architecture
 */

/**
 * Applies a changeSet to file data read from disk, producing the modified version.
 * This reads the entire file and applies all changes from the changeSet.
 *
 * @param readBytes - Function to read bytes from the original file
 * @param fileSize - Size of the original file
 * @param changeSet - Record of changes (byte index -> new value)
 * @returns Uint8Array containing the modified file data
 */
export async function applyChangeSet(
	readBytes: (offset: number, length: number) => Promise<Uint8Array>,
	fileSize: number,
	changeSet: Record<number, number>,
): Promise<Uint8Array> {
	// Read the entire file
	const data = await readBytes(0, fileSize);

	// Apply all changes
	for (const [offset, value] of Object.entries(changeSet).map(
		([k, v]) => [Number(k), v] as const,
	)) {
		if (offset < data.length) {
			data[offset] = value;
		}
	}

	return data;
}

/**
 * More memory-efficient version that reads and applies changes in chunks.
 * Use this for large files.
 *
 * @param readBytes - Function to read bytes from the original file
 * @param fileSize - Size of the original file
 * @param changeSet - Record of changes (byte index -> new value)
 * @param chunkSize - Size of chunks to process (default: 1MB)
 * @returns Uint8Array containing the modified file data
 */
export async function applyChangeSetChunked(
	readBytes: (offset: number, length: number) => Promise<Uint8Array>,
	fileSize: number,
	changeSet: Record<number, number>,
	chunkSize = 1024 * 1024, // 1MB chunks
): Promise<Uint8Array> {
	const result = new Uint8Array(fileSize);

	// Process file in chunks
	for (let offset = 0; offset < fileSize; offset += chunkSize) {
		const length = Math.min(chunkSize, fileSize - offset);
		const chunk = await readBytes(offset, length);

		// Copy chunk to result
		result.set(chunk, offset);
	}

	// Apply all changes
	for (const [offset, value] of Object.entries(changeSet).map(
		([k, v]) => [Number(k), v] as const,
	)) {
		if (offset < result.length) {
			result[offset] = value;
		}
	}

	return result;
}

/**
 * Gets the effective byte value at a given offset, considering the changeSet.
 *
 * @param readByte - Function to read a single byte from the original file
 * @param offset - Byte offset to read
 * @param changeSet - Record of changes (byte index -> new value)
 * @returns The byte value (from changeSet if modified, otherwise from file)
 */
export async function getByteValue(
	readByte: (offset: number) => Promise<number>,
	offset: number,
	changeSet: Record<number, number>,
): Promise<number> {
	if (offset in changeSet) {
		return changeSet[offset];
	}
	return readByte(offset);
}

/**
 * Checks if a file has any unsaved changes.
 *
 * @param changeSet - Record of changes (byte index -> new value)
 * @returns true if there are unsaved changes
 */
export function hasUnsavedChanges(changeSet: Record<number, number>): boolean {
	return Object.keys(changeSet).length > 0;
}

/**
 * Clears all changes from a changeSet.
 *
 * @returns Empty changeSet
 */
export function clearChangeSet(): Record<number, number> {
	return {};
}
