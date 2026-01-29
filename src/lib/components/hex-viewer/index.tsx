import { ContextMenu } from "@base-ui/react/context-menu";
import type { TargetedUIEvent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

interface HexViewerProps {
	data: Uint8Array | null;
	isActive?: boolean;
	onActivate?: () => void;
	diffSet?: Set<number> | null;
	onHasChanged?: (hasChanged: boolean) => void;
	onSaveRequest?: (data: Uint8Array) => Promise<void>;
}

const ROW_HEIGHT = 24;
const BYTES_PER_ROW = 16;
const OVERSCAN = 15;

export function HexViewer({
	data,
	isActive = false,
	onActivate,
	onHasChanged,
	onSaveRequest,
	diffSet,
}: Readonly<HexViewerProps>) {
	const containerRef = useRef<HTMLDivElement>(null);

	const [scrollTop, setScrollTop] = useState(0);
	const [containerHeight, setContainerHeight] = useState(600);

	const [selectedByte, setSelectedByte] = useState<number | null>(null);
	const [selectionStart, setSelectionStart] = useState<number | null>(null);
	const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);

	const [buffer, setBuffer] = useState<Uint8Array>(data ?? new Uint8Array(0));
	const [hexNibble, setHexNibble] = useState<"high" | "low">("high");

	// =============================
	// Utils
	// =============================

	const selectByte = useCallback((index: number) => {
		setSelectedByte(index);
		setSelectionStart(index);
		setSelectionEnd(index);
		setHexNibble("high");
	}, []);

	const isByteSelected = useCallback(
		(byteIndex: number) => {
			if (selectionStart === null || selectionEnd === null) return false;
			const start = Math.min(selectionStart, selectionEnd);
			const end = Math.max(selectionStart, selectionEnd);
			return byteIndex >= start && byteIndex <= end;
		},
		[selectionStart, selectionEnd],
	);

	// =============================
	// Copy
	// =============================

	const copyOffset = useCallback(() => {
		if (selectedByte === null) return;
		navigator.clipboard.writeText(
			`0x${selectedByte.toString(16).padStart(8, "0").toUpperCase()}`,
		);
	}, [selectedByte]);

	const copySelectionHex = useCallback(() => {
		if (selectionStart === null || selectionEnd === null) return;
		const start = Math.min(selectionStart, selectionEnd);
		const end = Math.max(selectionStart, selectionEnd);
		const hex = Array.from(buffer.slice(start, end + 1))
			.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
			.join(" ");
		navigator.clipboard.writeText(hex);
	}, [buffer, selectionStart, selectionEnd]);

	const copySelectionAscii = useCallback(() => {
		if (selectionStart === null || selectionEnd === null) return;
		const start = Math.min(selectionStart, selectionEnd);
		const end = Math.max(selectionStart, selectionEnd);
		const ascii = Array.from(buffer.slice(start, end + 1))
			.map((b) => (b >= 32 && b <= 126 ? String.fromCodePoint(b) : "."))
			.join("");
		navigator.clipboard.writeText(ascii);
	}, [buffer, selectionStart, selectionEnd]);

	// =============================
	// Effects
	// =============================

	useEffect(() => {
		setBuffer(data?.slice() ?? new Uint8Array(0));
		setSelectedByte(null);
		setSelectionStart(null);
		setSelectionEnd(null);
		setHexNibble("high");
	}, [data]);

	useEffect(() => {
		if (!containerRef.current) return;

		const updateSize = () =>
			setContainerHeight(containerRef.current?.clientHeight || 600);

		const ro = new ResizeObserver(updateSize);
		ro.observe(containerRef.current);
		updateSize();

		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const handleMouseUp = () => setIsSelecting(false);
		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, []);

	// =============================
	// Keyboard (só quando ativo)
	// =============================

	useEffect(() => {
		if (!isActive) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "c":
						e.preventDefault();
						copySelectionHex();
						return;
					case "s":
						e.preventDefault();
						onSaveRequest?.(buffer);
						return;
					case "a":
						e.preventDefault();
						setSelectionStart(0);
						setSelectionEnd(buffer.length - 1);
						return;
				}
			}

			if (e.key === "Escape") {
				setSelectionStart(null);
				setSelectionEnd(null);
				setSelectedByte(null);
				setHexNibble("high");
				return;
			}

			if (selectedByte === null) return;

			const key = e.key.toUpperCase();

			if (/^[0-9A-F]$/.test(key)) {
				e.preventDefault();

				const value = parseInt(key, 16);
				const newBuffer = buffer.slice();
				const oldByte = newBuffer[selectedByte];

				let newByte: number;

				if (hexNibble === "high") {
					newByte = (value << 4) | (oldByte & 0x0f);
					setHexNibble("low");
				} else {
					newByte = (oldByte & 0xf0) | value;
					setHexNibble("high");

					// avança cursor
					if (selectedByte < newBuffer.length - 1) {
						setSelectedByte(selectedByte + 1);
						setSelectionStart(selectedByte + 1);
						setSelectionEnd(selectedByte + 1);
					}
				}

				newBuffer[selectedByte] = newByte;
				setBuffer(newBuffer);
				onHasChanged?.(true);
				return;
			}

			let newIndex = selectedByte;

			switch (e.key) {
				case "ArrowRight":
					newIndex = Math.min(selectedByte + 1, buffer.length - 1);
					break;
				case "ArrowLeft":
					newIndex = Math.max(selectedByte - 1, 0);
					break;
				case "ArrowDown":
					newIndex = Math.min(selectedByte + BYTES_PER_ROW, buffer.length - 1);
					break;
				case "ArrowUp":
					newIndex = Math.max(selectedByte - BYTES_PER_ROW, 0);
					break;
				case "Home":
					newIndex = 0;
					break;
				case "End":
					newIndex = buffer.length - 1;
					break;
				default:
					return;
			}

			e.preventDefault();
			setSelectedByte(newIndex);
			setSelectionStart(newIndex);
			setSelectionEnd(newIndex);
			setHexNibble("high");
		}

		globalThis.addEventListener("keydown", handleKeyDown);
		return () => globalThis.removeEventListener("keydown", handleKeyDown);
	}, [isActive, buffer, selectedByte, copySelectionHex, onSaveRequest]);

	// =============================
	// Scroll / Virtualization
	// =============================

	const totalRows = Math.ceil(buffer.length / BYTES_PER_ROW);
	const totalHeight = totalRows * ROW_HEIGHT;

	const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
	const endRow = Math.min(
		totalRows,
		Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
	);

	const handleScroll = useCallback(
		(e: TargetedUIEvent<HTMLDivElement>) =>
			setScrollTop(e.currentTarget.scrollTop),
		[],
	);

	// =============================
	// Mouse
	// =============================

	const handleByteMouseDown = useCallback(
		(byteIndex: number) => {
			onActivate?.();
			setIsSelecting(true);
			selectByte(byteIndex);
		},
		[selectByte, onActivate],
	);

	const handleByteMouseEnter = useCallback(
		(byteIndex: number) => {
			if (!isSelecting || selectionStart === null) return;
			setSelectionEnd(byteIndex);
			setSelectedByte(byteIndex);
			setHexNibble("high");
		},
		[isSelecting, selectionStart],
	);

	// =============================
	// Auto-scroll para o byte selecionado
	// =============================

	useEffect(() => {
		if (selectedByte === null) return;
		if (!containerRef.current) return;

		const rowIndex = Math.floor(selectedByte / BYTES_PER_ROW);
		const byteTop = rowIndex * ROW_HEIGHT;
		const byteBottom = byteTop + ROW_HEIGHT;

		const viewTop = containerRef.current.scrollTop;
		const viewBottom = viewTop + containerHeight;

		if (byteTop < viewTop) {
			containerRef.current.scrollTop = byteTop;
			return;
		}

		if (byteBottom > viewBottom) {
			containerRef.current.scrollTop = byteBottom - containerHeight;
		}
	}, [selectedByte, containerHeight]);

	// =============================
	// Render
	// =============================

	return (
		<section
			className={`h-full flex flex-col border transition-colors ${
				isActive ? "border-primary ring-1 ring-primary/40" : "border-border"
			}`}
			onPointerDown={onActivate}
		>
			<div className="bg-muted border-b border-border px-4 py-2 flex gap-4 font-mono text-xs">
				<div className="w-20">Offset</div>
				<div className="flex">
					{Array.from({ length: BYTES_PER_ROW }, (_, i) => (
						<span key={i} className="w-6 text-center">
							{i.toString(16).toUpperCase()}
						</span>
					))}
				</div>
				<div className="flex-1 pl-2">Decoded</div>
			</div>

			<ContextMenu.Root>
				<ContextMenu.Trigger className="flex-1 overflow-hidden">
					<div
						ref={containerRef}
						className="h-full overflow-y-auto"
						onScroll={handleScroll}
					>
						<div style={{ height: totalHeight, position: "relative" }}>
							{Array.from(
								{ length: endRow - startRow },
								(_, i) => startRow + i,
							).map((rowIndex) => (
								<HexRow
									key={rowIndex}
									index={rowIndex}
									data={buffer}
									offsetTop={rowIndex * ROW_HEIGHT}
									isByteSelected={isByteSelected}
									onByteMouseDown={handleByteMouseDown}
									onByteMouseEnter={handleByteMouseEnter}
									diffSet={diffSet}
								/>
							))}
						</div>
					</div>
				</ContextMenu.Trigger>

				<ContextMenu.Portal>
					<ContextMenu.Positioner side="bottom" align="start">
						<ContextMenu.Popup className="bg-popover border rounded-md shadow-md py-1">
							<ContextMenu.Item onClick={copyOffset}>
								Copy Offset
							</ContextMenu.Item>
							{selectionStart !== selectionEnd && (
								<>
									<ContextMenu.Item onClick={copySelectionHex}>
										Copy as Hex
									</ContextMenu.Item>
									<ContextMenu.Item onClick={copySelectionAscii}>
										Copy as ASCII
									</ContextMenu.Item>
								</>
							)}
						</ContextMenu.Popup>
					</ContextMenu.Positioner>
				</ContextMenu.Portal>
			</ContextMenu.Root>
		</section>
	);
}

// ======================================================
// HexRow
// ======================================================

function HexRow({
	index,
	data,
	offsetTop,
	isByteSelected,
	onByteMouseDown,
	onByteMouseEnter,
	diffSet,
}: Readonly<{
	index: number;
	data: Uint8Array;
	offsetTop: number;
	isByteSelected: (i: number) => boolean;
	onByteMouseDown: (i: number) => void;
	onByteMouseEnter: (i: number) => void;
	diffSet?: Set<number> | null;
}>) {
	const offset = index * BYTES_PER_ROW;

	return (
		<div
			style={{ top: offsetTop }}
			className="absolute left-0 right-0 h-6 flex gap-4 px-4 font-mono text-xs"
		>
			<div className="w-20 text-muted-foreground select-none">
				{offset.toString(16).padStart(8, "0").toUpperCase()}
			</div>

			<div className="flex select-none">
				{Array.from({ length: BYTES_PER_ROW }, (_, i) => {
					const idx = offset + i;
					if (idx >= data.length) return <span key={i} className="w-6" />;

					return (
						<button
							key={i}
							type="button"
							tabIndex={-1}
							onPointerDown={(e) => {
								if (e.button !== 0) return; // Ignorar botões que não sejam o esquerdo
								e.preventDefault();
								onByteMouseDown(idx);
							}}
							onPointerEnter={(e) => e.buttons === 1 && onByteMouseEnter(idx)}
							className={`w-6 h-6 ${
								isByteSelected(idx)
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent"
							} ${diffSet?.has(idx) ? "bg-highlight" : ""}`}
						>
							{data[idx].toString(16).padStart(2, "0").toUpperCase()}
						</button>
					);
				})}
			</div>

			<div className="flex flex-1 items-center pl-2 select-none">
				{Array.from({ length: BYTES_PER_ROW }, (_, i) => {
					const idx = offset + i;
					if (idx >= data.length) return <span key={i} />;

					const byte = data[idx];
					const char =
						byte >= 32 && byte <= 126 ? String.fromCodePoint(byte) : ".";

					return (
						<span
							key={i}
							tabIndex={-1}
							onPointerDown={(e) => {
								if (e.button !== 0) return; // Ignorar botões que não sejam o esquerdo
								e.preventDefault();
								onByteMouseDown(idx);
							}}
							onPointerEnter={(e) => e.buttons === 1 && onByteMouseEnter(idx)}
							className={`text-center text-muted-foreground ${
								isByteSelected(idx)
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent"
							} ${diffSet?.has(idx) ? "bg-highlight" : ""} inline-block w-4`}
						>
							{char}
						</span>
					);
				})}
			</div>
		</div>
	);
}
