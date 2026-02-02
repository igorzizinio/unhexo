import { invoke } from "@tauri-apps/api/core";
import { useCallback, useRef, useState } from "preact/hooks";

interface FileBufferCache {
	[offset: number]: Uint8Array;
}

interface FileBufferState {
	filePath: string | null;
	fileSize: number;
	chunkSize: number;
	cache: FileBufferCache;
	loading: Set<number>;
}

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export function useFileBuffer() {
	const stateRef = useRef<FileBufferState>({
		filePath: null,
		fileSize: 0,
		chunkSize: CHUNK_SIZE,
		cache: {},
		loading: new Set(),
	});

	const [, forceUpdate] = useState(0);

	const openFile = useCallback(async (filePath: string) => {
		try {
			// Close previous file if exists
			if (stateRef.current.filePath) {
				await invoke("close_file_handle", {
					path: stateRef.current.filePath,
				});
			}

			// Open new file handle
			const info = await invoke<{ size: number }>("open_file_handle", {
				path: filePath,
			});

			stateRef.current = {
				filePath,
				fileSize: info.size,
				chunkSize: CHUNK_SIZE,
				cache: {},
				loading: new Set(),
			};

			forceUpdate((n) => n + 1);
			return info.size;
		} catch (error) {
			console.error("Failed to open file handle:", error);
			throw error;
		}
	}, []);

	const closeFile = useCallback(async () => {
		if (stateRef.current.filePath) {
			try {
				await invoke("close_file_handle", {
					path: stateRef.current.filePath,
				});
			} catch (error) {
				console.error("Failed to close file handle:", error);
			}
		}

		stateRef.current = {
			filePath: null,
			fileSize: 0,
			chunkSize: CHUNK_SIZE,
			cache: {},
			loading: new Set(),
		};

		forceUpdate((n) => n + 1);
	}, []);

	const getChunkOffset = useCallback((byteOffset: number) => {
		return (
			Math.floor(byteOffset / stateRef.current.chunkSize) *
			stateRef.current.chunkSize
		);
	}, []);

	const loadChunk = useCallback(async (chunkOffset: number) => {
		const state = stateRef.current;

		if (!state.filePath) return null;
		if (state.cache[chunkOffset]) return state.cache[chunkOffset];
		if (state.loading.has(chunkOffset)) return null;

		state.loading.add(chunkOffset);

		try {
			const data = await invoke<number[]>("read_file_chunk", {
				path: state.filePath,
				offset: chunkOffset,
				length: state.chunkSize,
			});

			const buffer = new Uint8Array(data);
			state.cache[chunkOffset] = buffer;
			state.loading.delete(chunkOffset);

			forceUpdate((n) => n + 1);
			return buffer;
		} catch (error) {
			console.error("Failed to load chunk:", error);
			state.loading.delete(chunkOffset);
			return null;
		}
	}, []);

	const readBytes = useCallback(
		async (offset: number, length: number): Promise<Uint8Array> => {
			const state = stateRef.current;
			if (!state.filePath) return new Uint8Array(0);

			const result = new Uint8Array(length);
			let resultOffset = 0;

			// Load all necessary chunks
			const chunks: number[] = [];
			let currentOffset = offset;
			while (currentOffset < offset + length) {
				const chunkOffset = getChunkOffset(currentOffset);
				if (!chunks.includes(chunkOffset)) {
					chunks.push(chunkOffset);
				}
				currentOffset += state.chunkSize;
			}

			// Load chunks in parallel
			await Promise.all(chunks.map((chunkOffset) => loadChunk(chunkOffset)));

			// Copy data from chunks to result
			let remainingBytes = length;
			let currentByteOffset = offset;

			while (remainingBytes > 0) {
				const chunkOffset = getChunkOffset(currentByteOffset);
				const chunk = state.cache[chunkOffset];

				if (!chunk) {
					// If chunk is not available, fill with zeros
					const bytesToCopy = Math.min(
						remainingBytes,
						state.chunkSize - (currentByteOffset % state.chunkSize),
					);
					result.fill(0, resultOffset, resultOffset + bytesToCopy);
					resultOffset += bytesToCopy;
					currentByteOffset += bytesToCopy;
					remainingBytes -= bytesToCopy;
					continue;
				}

				const offsetInChunk = currentByteOffset % state.chunkSize;
				const bytesToCopy = Math.min(
					remainingBytes,
					chunk.length - offsetInChunk,
				);

				result.set(
					chunk.subarray(offsetInChunk, offsetInChunk + bytesToCopy),
					resultOffset,
				);

				resultOffset += bytesToCopy;
				currentByteOffset += bytesToCopy;
				remainingBytes -= bytesToCopy;
			}

			return result;
		},
		[getChunkOffset, loadChunk],
	);

	const preloadRange = useCallback(
		async (startOffset: number, endOffset: number) => {
			const chunks: number[] = [];
			let currentOffset = startOffset;

			while (currentOffset <= endOffset) {
				const chunkOffset = getChunkOffset(currentOffset);
				if (!chunks.includes(chunkOffset)) {
					chunks.push(chunkOffset);
				}
				currentOffset += stateRef.current.chunkSize;
			}

			await Promise.all(chunks.map((chunkOffset) => loadChunk(chunkOffset)));
		},
		[getChunkOffset, loadChunk],
	);

	const clearCache = useCallback(() => {
		stateRef.current.cache = {};
		forceUpdate((n) => n + 1);
	}, []);

	return {
		openFile,
		closeFile,
		readBytes,
		preloadRange,
		clearCache,
		fileSize: stateRef.current.fileSize,
		filePath: stateRef.current.filePath,
		isReady: !!stateRef.current.filePath,
	};
}
