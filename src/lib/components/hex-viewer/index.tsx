import { ContextMenu } from "@base-ui/react/context-menu";
import type { TargetedUIEvent } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

interface HexViewerProps {
	data: Uint8Array | null;
	onHasChanged?: (hasChanged: boolean) => void;
	onSaveRequest?: (data: Uint8Array) => Promise<void>;
}

const ROW_HEIGHT = 24;
const BYTES_PER_ROW = 16;
const OVERSCAN = 15;

export function HexViewer({
	data,
	onHasChanged,
	onSaveRequest,
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
			setContainerHeight(containerRef.current!.clientHeight);

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
	// Keyboard
	// =============================

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.ctrlKey || e.metaKey) {
				if (e.key.toLowerCase() === "s") {
					e.preventDefault();
					onSaveRequest?.(buffer);
				}

				if (e.key.toLowerCase() === "a") {
					e.preventDefault();
					setSelectionStart(0);
					setSelectionEnd(buffer.length - 1);
				}
				return;
			}

			if (e.key === "Escape") {
				setSelectionStart(null);
				setSelectionEnd(null);
				setSelectedByte(null);
				setHexNibble("high");
				return;
			}

			// Arrow keys navigation
			if (selectedByte !== null) {
				let newIndex = selectedByte;
				if (e.key === "ArrowRight")
					newIndex = Math.min(selectedByte + 1, buffer.length - 1);
				else if (e.key === "ArrowLeft")
					newIndex = Math.max(selectedByte - 1, 0);
				else if (e.key === "ArrowDown")
					newIndex = Math.min(selectedByte + BYTES_PER_ROW, buffer.length - 1);
				else if (e.key === "ArrowUp")
					newIndex = Math.max(selectedByte - BYTES_PER_ROW, 0);
				else if (e.key === "Backspace")
					newIndex = Math.max(selectedByte - 1, 0);
				else if (e.key === "Tab") {
					// Here we prevent default always because of browser default tab behavior
					// should we move to first byte when at the end? (if so, we need to add this to backspace too!)
					e.preventDefault();
					newIndex = Math.min(selectedByte + 1, buffer.length - 1);
				} else if (e.key === "Home") newIndex = 0;
				else if (e.key === "End") newIndex = buffer.length - 1;

				if (newIndex !== selectedByte) {
					e.preventDefault();
					setSelectedByte(newIndex);
					if (e.shiftKey) {
						setSelectionEnd(newIndex);
					} else {
						setSelectionStart(newIndex);
						setSelectionEnd(newIndex);
					}
					setHexNibble("high");
					return;
				}
			}

			if (!/^[0-9a-fA-F]$/.test(e.key) || selectedByte === null) return;

			e.preventDefault();

			const hex = parseInt(e.key, 16);
			const newBuffer = buffer.slice();
			const current = buffer[selectedByte];

			if (hexNibble === "high") {
				newBuffer[selectedByte] = (hex << 4) | (current & 0x0f);
				setHexNibble("low");
			} else {
				newBuffer[selectedByte] = (current & 0xf0) | hex;

				const next = Math.min(selectedByte + 1, buffer.length - 1);
				setSelectedByte(next);
				setSelectionStart(next);
				setSelectionEnd(next);
				setHexNibble("high");
			}

			setBuffer(newBuffer);
			onHasChanged?.(true);
		}

		globalThis.addEventListener("keydown", handleKeyDown);
		return () => globalThis.removeEventListener("keydown", handleKeyDown);
	}, [buffer, selectedByte, hexNibble, onHasChanged, onSaveRequest]);

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
	// Mouse handlers
	// =============================

	const handleByteMouseDown = useCallback(
		(byteIndex: number) => {
			setIsSelecting(true);
			selectByte(byteIndex);
		},
		[selectByte],
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
	// Copy actions
	// =============================

	const copyOffset = () => {
		if (selectedByte === null) return;
		navigator.clipboard.writeText(
			`0x${selectedByte.toString(16).padStart(8, "0").toUpperCase()}`,
		);
	};

	const copySelectionHex = () => {
		if (selectionStart === null || selectionEnd === null) return;
		const start = Math.min(selectionStart, selectionEnd);
		const end = Math.max(selectionStart, selectionEnd);
		const hex = Array.from(buffer.slice(start, end + 1))
			.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
			.join(" ");
		navigator.clipboard.writeText(hex);
	};

	const copySelectionAscii = () => {
		if (selectionStart === null || selectionEnd === null) return;
		const start = Math.min(selectionStart, selectionEnd);
		const end = Math.max(selectionStart, selectionEnd);
		const ascii = Array.from(buffer.slice(start, end + 1))
			.map((b) => (b >= 32 && b <= 126 ? String.fromCodePoint(b) : "."))
			.join("");
		navigator.clipboard.writeText(ascii);
	};

	// =============================
	// Render
	// =============================

	return (
		<div className="h-full flex flex-col bg-background">
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
								/>
							))}
						</div>
					</div>
				</ContextMenu.Trigger>

				<ContextMenu.Portal>
					<ContextMenu.Positioner side="bottom" align="start">
						<ContextMenu.Popup className="bg-popover border rounded-md shadow-md py-1">
							<ContextMenu.Item
								onClick={copyOffset}
								className="px-4 py-2 hover:bg-accent"
							>
								Copy Offset
							</ContextMenu.Item>

							{selectionStart !== selectionEnd && (
								<>
									<ContextMenu.Item
										onClick={copySelectionHex}
										className="px-4 py-2 hover:bg-accent"
									>
										Copy as Hex
									</ContextMenu.Item>
									<ContextMenu.Item
										onClick={copySelectionAscii}
										className="px-4 py-2 hover:bg-accent"
									>
										Copy as ASCII
									</ContextMenu.Item>
								</>
							)}
						</ContextMenu.Popup>
					</ContextMenu.Positioner>
				</ContextMenu.Portal>
			</ContextMenu.Root>
		</div>
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
}: Readonly<{
	index: number;
	data: Uint8Array;
	offsetTop: number;
	isByteSelected: (i: number) => boolean;
	onByteMouseDown: (i: number) => void;
	onByteMouseEnter: (i: number) => void;
}>) {
	const offset = index * BYTES_PER_ROW;

	return (
		<div
			style={{ top: offsetTop }}
			className="absolute left-0 right-0 h-6 flex gap-4 px-4 font-mono text-xs"
		>
			<div className="w-20 text-muted-foreground">
				{offset.toString(16).padStart(8, "0").toUpperCase()}
			</div>

			<div className="flex">
				{Array.from({ length: BYTES_PER_ROW }, (_, i) => {
					const idx = offset + i;
					if (idx >= data.length) return <span key={i} className="w-6" />;

					const selected = isByteSelected(idx);

					return (
						<button
							key={i}
							type="button"
							onPointerDown={(e) => {
								if (e.button === 0) {
									e.preventDefault();
									onByteMouseDown(idx);
								}
							}}
							onPointerEnter={(e) => e.buttons === 1 && onByteMouseEnter(idx)}
							className={`w-6 h-6 ${
								selected
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent"
							}`}
						>
							{data[idx].toString(16).padStart(2, "0").toUpperCase()}
						</button>
					);
				})}
			</div>

			<div className="flex text-muted-foreground">
				{Array.from({ length: BYTES_PER_ROW }, (_, i) => {
					const idx = offset + i;
					if (idx >= data.length) return <span key={i} />;

					const c =
						data[idx] >= 32 && data[idx] <= 126
							? String.fromCodePoint(data[idx])
							: ".";

					return (
						<button
							key={i}
							type="button"
							onPointerDown={() => onByteMouseDown(idx)}
							onPointerEnter={() => onByteMouseEnter(idx)}
							className={`w-4 h-4 ${
								isByteSelected(idx)
									? "bg-primary text-primary-foreground"
									: "hover:bg-accent"
							}`}
						>
							{c}
						</button>
					);
				})}
			</div>
		</div>
	);
}
