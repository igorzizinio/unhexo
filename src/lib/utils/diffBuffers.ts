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
