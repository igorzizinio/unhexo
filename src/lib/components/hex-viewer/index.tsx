import { ContextMenu } from "@base-ui/react/context-menu";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import HexRow from "@/lib/components/hex-row";
import type { Tab } from "@/lib/context/FileContext";
import { useFiles } from "@/lib/context/FileContext";
import { useDiffInRange } from "@/lib/hooks/useDiff";
import { useFileBuffer } from "@/lib/hooks/useFileBuffer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BufferedHexViewerProps {
	tabId: string;
	filePath: string;
	fileSize: number;
	changeSet: Record<number, number>;
	isActive?: boolean;
	onActivate?: () => void;
	compareWithTab?: Tab;
	diffNavigation?: {
		findNextDiff: (fromOffset: number) => Promise<number | null>;
		findPrevDiff: (fromOffset: number) => Promise<number | null>;
		isSearching: boolean;
	};
	className?: string;
	version?: number;
}

const ROW_HEIGHT = 24;
const BYTES_PER_ROW = 16;
const OVERSCAN = 15;
const PRELOAD_ROWS = 100; // Preload 100 rows ahead

export function BufferedHexViewer({
	tabId,
	filePath,
	fileSize,
	changeSet,
	isActive = false,
	onActivate,
	compareWithTab,
	diffNavigation,
	version = 0,
	className,
}: Readonly<BufferedHexViewerProps>) {
	const { updateChangeSet } = useFiles();
	const fileBuffer = useFileBuffer();

	const rootRef = useRef<HTMLElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [virtualScrollTop, setVirtualScrollTop] = useState(0);
	const [containerHeight, setContainerHeight] = useState(600);
	const [visibleBuffer, setVisibleBuffer] = useState<Uint8Array>(
		new Uint8Array(0),
	);
	const [visibleStartOffset, setVisibleStartOffset] = useState(0);
	const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);

	const [selectedByte, setSelectedByte] = useState<number | null>(null);
	const [selectionStart, setSelectionStart] = useState<number | null>(null);
	const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);

	const [hexNibble, setHexNibble] = useState<"high" | "low">("high");

	// Compute diffs only for the visible range when comparing
	const currentTab = compareWithTab
		? ({
				id: tabId,
				filePath,
				fileSize,
				changeSet,
			} as Tab)
		: null;

	const visibleLength = visibleBuffer.length;
	const diffSet = useDiffInRange(
		currentTab,
		compareWithTab ?? null,
		visibleStartOffset,
		visibleLength,
	);

	// Open file buffer when component mounts or filePath changes
	useEffect(() => {
		if (filePath) {
			fileBuffer.openFile(filePath);
		}
		return () => {
			if (filePath) {
				fileBuffer.closeFile();
			}
		};
	}, [filePath, version]);

	// Load visible data based on scroll position
	useEffect(() => {
		if (!fileBuffer.isReady) return;

		const totalRows = Math.ceil(fileSize / BYTES_PER_ROW);

		const loadVisibleData = async () => {
			const startRow = Math.max(
				0,
				Math.floor(virtualScrollTop / ROW_HEIGHT) - OVERSCAN,
			);
			const endRow = Math.min(
				totalRows,
				Math.ceil((virtualScrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
			);

			const startOffset = startRow * BYTES_PER_ROW;
			const endOffset = Math.min(fileSize, endRow * BYTES_PER_ROW);
			const length = endOffset - startOffset;

			if (length > 0) {
				const data = await fileBuffer.readBytes(startOffset, length);
				setVisibleBuffer(data);
				setVisibleStartOffset(startOffset);

				// Preload data ahead
				const preloadEndOffset = Math.min(
					fileSize,
					endOffset + PRELOAD_ROWS * BYTES_PER_ROW,
				);
				if (preloadEndOffset > endOffset) {
					fileBuffer.preloadRange(endOffset, preloadEndOffset);
				}
			}
		};

		loadVisibleData();
	}, [virtualScrollTop, containerHeight, fileBuffer.isReady, fileSize]);

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

	const getByteValue = useCallback(
		(byteIndex: number): number => {
			// Check changeSet first - modified bytes take precedence
			if (byteIndex in changeSet) {
				return changeSet[byteIndex];
			}

			// Otherwise read from the visible buffer
			const offsetInVisible = byteIndex - visibleStartOffset;
			if (offsetInVisible >= 0 && offsetInVisible < visibleBuffer.length) {
				return visibleBuffer[offsetInVisible];
			}
			return 0;
		},
		[visibleBuffer, visibleStartOffset, changeSet],
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

	const copySelectionHex = useCallback(async () => {
		if (selectionStart === null || selectionEnd === null) return;
		const start = Math.min(selectionStart, selectionEnd);
		const end = Math.max(selectionStart, selectionEnd);

		const data = await fileBuffer.readBytes(start, end - start + 1);
		const hex = Array.from(data)
			.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
			.join(" ");
		navigator.clipboard.writeText(hex);
	}, [fileBuffer, selectionStart, selectionEnd]);

	const copySelectionAscii = useCallback(async () => {
		if (selectionStart === null || selectionEnd === null) return;
		const start = Math.min(selectionStart, selectionEnd);
		const end = Math.max(selectionStart, selectionEnd);

		const data = await fileBuffer.readBytes(start, end - start + 1);
		const ascii = Array.from(data)
			.map((b) => (b >= 32 && b <= 126 ? String.fromCodePoint(b) : "."))
			.join("");
		navigator.clipboard.writeText(ascii);
	}, [fileBuffer, selectionStart, selectionEnd]);

	// =============================
	// Effects
	// =============================

	useEffect(() => {
		setSelectedByte(null);
		setSelectionStart(null);
		setSelectionEnd(null);
		setHexNibble("high");
	}, [tabId]);

	useEffect(() => {
		if (isActive) {
			rootRef.current?.focus();
		}
	}, [isActive]);

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
	// Diff Navigation
	// =============================

	const scrollToOffset = useCallback((offset: number) => {
		const rowIndex = Math.floor(offset / BYTES_PER_ROW);
		const scrollTop = rowIndex * ROW_HEIGHT;
		setVirtualScrollTop(scrollTop);
		setSelectedByte(offset);
		setSelectionStart(offset);
		setSelectionEnd(offset);
		setHexNibble("high");
	}, []);

	const handleNextDiff = useCallback(async () => {
		if (!diffNavigation) return;

		const fromOffset =
			selectedByte === null ? visibleStartOffset : selectedByte + 1;
		const result = await diffNavigation.findNextDiff(fromOffset);

		if (result !== null) {
			scrollToOffset(result);
		}
	}, [diffNavigation, selectedByte, visibleStartOffset, scrollToOffset]);

	const handlePrevDiff = useCallback(async () => {
		if (!diffNavigation) return;

		const fromOffset = selectedByte ?? visibleStartOffset + visibleLength;
		const result = await diffNavigation.findPrevDiff(fromOffset);

		if (result !== null) {
			scrollToOffset(result);
		}
	}, [
		diffNavigation,
		selectedByte,
		visibleStartOffset,
		visibleLength,
		scrollToOffset,
	]);

	// =============================
	// Keyboard
	// =============================

	const handleKeyDown = useCallback(
		async (e: KeyboardEvent) => {
			// Ctrl / Cmd
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "c":
						e.preventDefault();
						e.shiftKey ? await copySelectionAscii() : await copySelectionHex();
						return;
					case "a":
						e.preventDefault();
						setSelectionStart(0);
						setSelectionEnd(fileSize - 1);
						return;
				}
			}

			// Diff navigation shortcuts
			if (diffNavigation && e.key === "F6") {
				e.preventDefault();
				if (e.shiftKey) {
					await handlePrevDiff();
				} else {
					await handleNextDiff();
				}
				return;
			}

			if (e.altKey) {
				if (e.key === "Insert") {
					e.preventDefault();
					copyOffset();
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

				const value = Number.parseInt(key, 16);
				const oldByte = getByteValue(selectedByte);

				let newByte: number;

				if (hexNibble === "high") {
					newByte = (value << 4) | (oldByte & 0x0f);
					setHexNibble("low");
				} else {
					newByte = (oldByte & 0xf0) | value;
					setHexNibble("high");

					// Advance cursor
					if (selectedByte < fileSize - 1) {
						setSelectedByte(selectedByte + 1);
						setSelectionStart(selectedByte + 1);
						setSelectionEnd(selectedByte + 1);
					}
				}

				// Update the changeSet with the new byte value
				// No need to load the full buffer anymore
				updateChangeSet(tabId, selectedByte, newByte);
				return;
			}
			let newIndex = selectedByte;

			switch (e.key) {
				case "ArrowRight":
					newIndex = Math.min(selectedByte + 1, fileSize - 1);
					break;
				case "ArrowLeft":
					newIndex = Math.max(selectedByte - 1, 0);
					break;
				case "ArrowDown":
					newIndex = Math.min(selectedByte + BYTES_PER_ROW, fileSize - 1);
					break;
				case "ArrowUp":
					newIndex = Math.max(selectedByte - BYTES_PER_ROW, 0);
					break;
				case "PageDown":
					// we add a little "calm down", to allow the browser full render, and also find the diff
					await sleep(75);
					newIndex = Math.min(
						selectedByte +
							BYTES_PER_ROW * Math.floor(containerHeight / ROW_HEIGHT),
						fileSize - 1,
					);
					break;
				case "PageUp":
					// we add a little "calm down", to allow the browser full render, and also find the diff
					await sleep(75);
					newIndex = Math.max(
						selectedByte -
							BYTES_PER_ROW * Math.floor(containerHeight / ROW_HEIGHT),
						0,
					);
					break;
				case "Home":
					newIndex = 0;
					break;
				case "End":
					newIndex = fileSize - 1;
					break;
				default:
					return;
			}

			e.preventDefault();
			setSelectedByte(newIndex);

			// Handle selection with Shift key
			if (e.shiftKey) {
				// If no selection exists, start from current position
				if (selectionStart === null) {
					setSelectionStart(selectedByte);
				}
				setSelectionEnd(newIndex);
			} else {
				// Without Shift, move cursor and reset selection to single byte
				setSelectionStart(newIndex);
				setSelectionEnd(newIndex);
			}

			setHexNibble("high");
		},
		[
			fileSize,
			selectedByte,
			hexNibble,
			copySelectionHex,
			diffSet,
			getByteValue,
			updateChangeSet,
			tabId,
			selectionStart,
			containerHeight,
			diffNavigation,
			handleNextDiff,
			handlePrevDiff,
		],
	);

	// =============================
	// Scroll / Virtualization
	// =============================

	const totalRows = Math.ceil(fileSize / BYTES_PER_ROW);
	const maxVirtualScroll = Math.max(
		0,
		totalRows * ROW_HEIGHT - containerHeight,
	);

	const startRow = Math.max(
		0,
		Math.floor(virtualScrollTop / ROW_HEIGHT) - OVERSCAN,
	);
	const endRow = Math.min(
		totalRows,
		Math.ceil((virtualScrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
	);

	// Handle scrollbar dragging
	const handleScrollbarMouseDown = useCallback((e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		setIsDraggingScrollbar(true);
	}, []);

	const handleScrollbarDrag = useCallback(
		(e: MouseEvent) => {
			if (!isDraggingScrollbar || !containerRef.current) return;

			const rect = containerRef.current.getBoundingClientRect();
			const relativeY = e.clientY - rect.top;
			const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
			const totalScrollableHeight = totalRows * ROW_HEIGHT;
			const newScroll =
				percentage * totalScrollableHeight - containerHeight / 2;

			setVirtualScrollTop(Math.max(0, Math.min(maxVirtualScroll, newScroll)));
		},
		[isDraggingScrollbar, maxVirtualScroll, totalRows, containerHeight],
	);

	const handleScrollbarMouseUp = useCallback(() => {
		setIsDraggingScrollbar(false);
	}, []);

	// Handle clicking on scrollbar track (not thumb)
	const handleScrollbarTrackClick = useCallback(
		(e: MouseEvent) => {
			if (!containerRef.current) return;

			// Only handle clicks on the track, not the thumb
			const target = e.target as HTMLElement;
			if (target.classList.contains("scrollbar-thumb")) return;

			const rect = containerRef.current.getBoundingClientRect();
			const relativeY = e.clientY - rect.top;
			const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
			const totalScrollableHeight = totalRows * ROW_HEIGHT;
			const newScroll =
				percentage * totalScrollableHeight - containerHeight / 2;

			setVirtualScrollTop(Math.max(0, Math.min(maxVirtualScroll, newScroll)));
		},
		[maxVirtualScroll, totalRows, containerHeight],
	);

	// Attach global mouse events for scrollbar dragging
	useEffect(() => {
		if (!isDraggingScrollbar) return;

		const dragHandler = handleScrollbarDrag as unknown as EventListener;
		const upHandler = handleScrollbarMouseUp as unknown as EventListener;

		document.addEventListener("mousemove", dragHandler);
		document.addEventListener("mouseup", upHandler);

		return () => {
			document.removeEventListener("mousemove", dragHandler);
			document.removeEventListener("mouseup", upHandler);
		};
	}, [isDraggingScrollbar, handleScrollbarDrag, handleScrollbarMouseUp]);

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

		const rowIndex = Math.floor(selectedByte / BYTES_PER_ROW);
		const byteTop = rowIndex * ROW_HEIGHT;
		const byteBottom = byteTop + ROW_HEIGHT;

		setVirtualScrollTop((currentScroll) => {
			const viewTop = currentScroll;
			const viewBottom = viewTop + containerHeight;

			// Only auto-scroll if the selected byte is outside the visible area
			if (byteTop < viewTop) {
				return byteTop;
			}

			if (byteBottom > viewBottom) {
				return byteBottom - containerHeight;
			}

			// Don't change scroll if byte is already visible
			return currentScroll;
		});
	}, [selectedByte, containerHeight]);

	// =============================
	// Render
	// =============================

	return (
		// biome-ignore lint: ééé precisamos disso
		<section
			className={`h-full flex flex-col border-2 rounded ${
				isActive ? "border-primary ring-1 ring-primary/40" : "border-border"
			} ${className ?? ""}`}
			ref={rootRef}
			onPointerDown={(e) => {
				onActivate?.();
				e.currentTarget.focus();
			}}
			// biome-ignore lint: ééé precisamos disso
			tabIndex={0}
			onKeyDown={handleKeyDown}
		>
			<div className="bg-accent border-b border-border px-4 py-2 flex gap-4 font-mono text-xs select-none">
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
				<ContextMenu.Trigger className="flex-1 overflow-hidden relative">
					<div
						ref={containerRef}
						className="h-full overflow-hidden relative"
						onWheel={(e) => {
							e.preventDefault();
							// Scroll by 3 rows per wheel tick
							const rowsToScroll = Math.sign(e.deltaY) * 3;
							const scrollAmount = rowsToScroll * ROW_HEIGHT;
							setVirtualScrollTop((prev) => {
								const newScroll = prev + scrollAmount;
								return Math.max(0, Math.min(maxVirtualScroll, newScroll));
							});
						}}
					>
						<div className="absolute inset-0">
							{Array.from(
								{ length: endRow - startRow },
								(_, i) => startRow + i,
							).map((rowIndex) => {
								// Use the visible buffer for rendering
								const rowOffset = rowIndex * BYTES_PER_ROW;
								const offsetInVisible = rowOffset - visibleStartOffset;

								// Only render rows that are in the visible buffer
								if (
									offsetInVisible < 0 ||
									offsetInVisible >= visibleBuffer.length
								) {
									return null;
								}

								// Calculate position relative to virtualScrollTop
								const absoluteTop = rowIndex * ROW_HEIGHT;
								const relativeTop = absoluteTop - virtualScrollTop;

								return (
									<HexRow
										key={rowIndex}
										bytesPerRow={BYTES_PER_ROW}
										index={rowIndex}
										data={visibleBuffer}
										dataOffset={visibleStartOffset}
										offsetTop={relativeTop}
										isByteSelected={isByteSelected}
										onByteMouseDown={handleByteMouseDown}
										onByteMouseEnter={handleByteMouseEnter}
										diffSet={diffSet}
										changeSet={changeSet}
									/>
								);
							})}
						</div>

						{/* Custom Scrollbar */}
						{maxVirtualScroll > 0 && (
							<button
								type="button"
								aria-controls={containerRef.current?.id}
								aria-valuenow={virtualScrollTop}
								aria-valuemin={0}
								aria-valuemax={maxVirtualScroll}
								aria-orientation="vertical"
								role={"scrollbar"}
								aria-label="Scrollbar track"
								className="absolute right-0 top-0 bottom-0 w-3 bg-accent/20 hover:bg-accent/30 transition-colors cursor-pointer border-0 p-0"
								onMouseDown={handleScrollbarTrackClick}
							>
								{/** biome-ignore lint/a11y/noStaticElementInteractions: necessary */}
								<div
									className="scrollbar-thumb absolute right-0 w-3 bg-primary/60 hover:bg-primary/80 cursor-grab active:cursor-grabbing transition-colors"
									style={{
										top: `${(virtualScrollTop / maxVirtualScroll) * (100 - Math.max(2, (containerHeight / (totalRows * ROW_HEIGHT)) * 100))}%`,
										height: `${Math.max(2, (containerHeight / (totalRows * ROW_HEIGHT)) * 100)}%`,
									}}
									onMouseDown={handleScrollbarMouseDown}
								/>
							</button>
						)}
					</div>
				</ContextMenu.Trigger>

				<ContextMenu.Portal>
					<ContextMenu.Positioner side="bottom" align="start">
						<ContextMenu.Popup className="flex flex-col text-sm bg-popover border border-border rounded-md shadow-md p-2 text-foreground">
							<ContextMenu.Item
								onClick={copyOffset}
								className={
									"flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
								}
							>
								<span>Copy Offset</span>
								<span className={"text-xs text-muted-foreground"}>
									(ALT + Insert)
								</span>
							</ContextMenu.Item>
							{selectionStart !== selectionEnd && (
								<>
									<ContextMenu.Item
										className={
											"flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
										}
										onClick={copySelectionHex}
									>
										<span>Copy as Hex</span>
										<span className={"text-xs text-muted-foreground"}>
											(CTRL + C)
										</span>
									</ContextMenu.Item>
									<ContextMenu.Item
										onClick={copySelectionAscii}
										className={
											"flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
										}
									>
										<span>Copy as ASCII</span>
										<span className={"text-xs text-muted-foreground"}>
											(CTRL + Shift + C)
										</span>
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
