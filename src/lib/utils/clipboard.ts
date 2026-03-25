import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Writes text to the system clipboard via Tauri.
 * @param text - The text to write to clipboard
 * @throws If clipboard write fails
 */
export async function copyToClipboard(text: string): Promise<void> {
	try {
		await writeText(text);
	} catch (error) {
		console.error("Failed to write to clipboard:", error);
		throw error;
	}
}

/**
 * Reads text from the system clipboard via Tauri.
 * @returns The clipboard text content, or empty string if empty/unreadable
 */
export async function readFromClipboard(): Promise<string> {
	try {
		return await readText();
	} catch (error) {
		console.error("Failed to read from clipboard:", error);
		return "";
	}
}

/**
 * Formats a single byte offset as hex with 0x prefix and uppercase.
 * @param offset - The byte offset
 * @returns Formatted hex string, e.g., "0x000000AF"
 */
export function formatOffsetAsHex(offset: number): string {
	return `0x${offset.toString(16).padStart(8, "0").toUpperCase()}`;
}

/**
 * Formats an array of bytes as space-separated hex values.
 * @param bytes - The bytes to format
 * @returns Formatted hex string, e.g., "AA BB CC"
 */
export function formatBytesAsHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
		.join(" ");
}

/**
 * Formats an array of bytes as ASCII, with unprintable chars as dots.
 * @param bytes - The bytes to format
 * @returns Formatted ASCII string
 */
export function formatBytesAsAscii(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => (b >= 32 && b <= 126 ? String.fromCodePoint(b) : "."))
		.join("");
}

/**
 * Parses clipboard text as hex byte values.
 * Supports multiple formats: "AA BB CC", "0xAA 0xBB 0xCC", "AABBCC", etc.
 * @param text - The text to parse
 * @returns Array of parsed byte values, or empty if parsing fails
 */
export function parseHexBytesFromClipboard(text: string): number[] {
	const trimmed = text.trim();
	if (!trimmed) return [];

	const parsed: number[] = [];
	const rawTokens = trimmed.split(/[\s,;]+/g).filter(Boolean);

	for (const rawToken of rawTokens) {
		const token = rawToken.replace(/^0x/i, "").trim();
		if (!token) continue;

		if (/^[0-9a-fA-F]{2}$/.test(token)) {
			parsed.push(Number.parseInt(token, 16));
			continue;
		}

		if (/^[0-9a-fA-F]+$/.test(token) && token.length % 2 === 0) {
			for (let i = 0; i < token.length; i += 2) {
				parsed.push(Number.parseInt(token.slice(i, i + 2), 16));
			}
			continue;
		}

		return [];
	}

	if (parsed.length > 0) {
		return parsed;
	}

	const denseHex = trimmed.replace(/0x/gi, "").replace(/[^0-9a-fA-F]/g, "");
	if (denseHex.length > 1 && denseHex.length % 2 === 0) {
		const bytes: number[] = [];
		for (let i = 0; i < denseHex.length; i += 2) {
			bytes.push(Number.parseInt(denseHex.slice(i, i + 2), 16));
		}
		return bytes;
	}

	return [];
}
