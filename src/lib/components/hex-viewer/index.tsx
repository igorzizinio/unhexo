import { ContextMenu } from "@base-ui/react/context-menu";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import HexRow from "@/lib/components/hex-row";
import GoToOffsetDialog from "@/lib/components/hex-viewer/go-to-offset-dialog";
import VirtualScrollbar from "@/lib/components/hex-viewer/virtual-scrollbar";
import type { Tab } from "@/lib/context/FileContext";
import { useFiles } from "@/lib/context/FileContext";
import { useDiffInRange } from "@/lib/hooks/useDiff";
import { useFileBuffer } from "@/lib/hooks/useFileBuffer";
import { useHexViewerSelection } from "@/lib/hooks/useHexViewerSelection";
import { useHexViewerVirtualization } from "@/lib/hooks/useHexViewerVirtualization";

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
  const { updateChangeSet, undoChangeSet } = useFiles();
  const fileBuffer = useFileBuffer();

  const rootRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [goToOffsetOpen, setGoToOffsetOpen] = useState(false);

  const {
    virtualScrollTop,
    setVirtualScrollTop,
    containerHeight,
    setContainerHeight,
    visibleBuffer,
    visibleStartOffset,
    visibleLength,
    totalRows,
    maxVirtualScroll,
    startRow,
    endRow,
    scrollToOffset,
    ensureOffsetVisible,
    ROW_HEIGHT,
    BYTES_PER_ROW,
  } = useHexViewerVirtualization({
    fileSize,
    isBufferReady: fileBuffer.isReady,
    readBytes: fileBuffer.readBytes,
    preloadRange: fileBuffer.preloadRange,
  });

  const toggleGoToOffset = useCallback(() => {
    setGoToOffsetOpen((prev) => !prev);
  }, []);

  const {
    selectedByte,
    selectionStart,
    selectionEnd,
    isSelecting,
    setIsSelecting,
    setSelectedByte,
    setSelectionStart,
    setSelectionEnd,
    selectByte,
    isByteSelected,
    copyOffset,
    copySelectionHex,
    copySelectionAscii,
    pasteInSelection,
    pasteIgnoringSelection,
    handleKeyDown,
    resetSelection,
  } = useHexViewerSelection({
    fileSize,
    changeSet,
    visibleBuffer,
    visibleStartOffset,
    fileBuffer,
    tabId,
    updateChangeSet,
    undoChangeSet,
    containerHeight,
    bytesPerRow: BYTES_PER_ROW,
    rowHeight: ROW_HEIGHT,
    onToggleGoTo: toggleGoToOffset,
  });

  const currentTab = compareWithTab
    ? ({
        id: tabId,
        filePath,
        fileSize,
        changeSet,
      } as Tab)
    : null;

  const diffSet = useDiffInRange(
    currentTab,
    compareWithTab ?? null,
    visibleStartOffset,
    visibleLength,
  );

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

  useEffect(() => {
    resetSelection();
  }, [tabId, resetSelection]);

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
  }, [setContainerHeight]);

  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [setIsSelecting]);

  useEffect(() => {
    if (selectedByte === null) return;
    ensureOffsetVisible(selectedByte);
  }, [selectedByte, ensureOffsetVisible]);

  const handleGoToOffset = useCallback(
    (offset: number) => {
      scrollToOffset(offset);
      setSelectedByte(offset);
      setSelectionStart(offset);
      setSelectionEnd(offset);
    },
    [scrollToOffset, setSelectedByte, setSelectionEnd, setSelectionStart],
  );

  const handleNextDiff = useCallback(async () => {
    if (!diffNavigation) return;

    const fromOffset =
      selectedByte === null ? visibleStartOffset : selectedByte + 1;
    const result = await diffNavigation.findNextDiff(fromOffset);

    if (result !== null) {
      handleGoToOffset(result);
    }
  }, [diffNavigation, handleGoToOffset, selectedByte, visibleStartOffset]);

  const handlePrevDiff = useCallback(async () => {
    if (!diffNavigation) return;

    const fromOffset = selectedByte ?? visibleStartOffset + visibleLength;
    const result = await diffNavigation.findPrevDiff(fromOffset);

    if (result !== null) {
      handleGoToOffset(result);
    }
  }, [
    diffNavigation,
    handleGoToOffset,
    selectedByte,
    visibleLength,
    visibleStartOffset,
  ]);

  const handleContainerKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (diffNavigation && e.key === "F6") {
        e.preventDefault();
        if (e.shiftKey) {
          await handlePrevDiff();
        } else {
          await handleNextDiff();
        }
        return;
      }

      await handleKeyDown(e);
    },
    [diffNavigation, handleKeyDown, handleNextDiff, handlePrevDiff],
  );

  const handleByteMouseDown = useCallback(
    (byteIndex: number) => {
      onActivate?.();
      setIsSelecting(true);
      selectByte(byteIndex);
    },
    [onActivate, selectByte, setIsSelecting],
  );

  const handleByteMouseEnter = useCallback(
    (byteIndex: number) => {
      if (!isSelecting || selectionStart === null) return;
      setSelectionEnd(byteIndex);
      setSelectedByte(byteIndex);
    },
    [isSelecting, selectionStart, setSelectedByte, setSelectionEnd],
  );

  const hasSelection = selectionStart !== null && selectionEnd !== null;
  const hasMultiSelection = hasSelection && selectionStart !== selectionEnd;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: we need to have keyboard events on the container for navigation and editing
    <section
      className={`h-full flex flex-col border-2 rounded ${
        isActive ? "border-primary ring-1 ring-primary/40" : "border-border"
      } ${className ?? ""}`}
      ref={rootRef}
      onPointerDown={(e) => {
        onActivate?.();
        e.currentTarget.focus();
      }}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: container must be keyboard-focusable for hex editing
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
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
              const rowsToScroll = Math.sign(e.deltaY) * 3;
              const scrollAmount = rowsToScroll * ROW_HEIGHT;
              setVirtualScrollTop((prev) => {
                const nextScroll = prev + scrollAmount;
                return Math.max(0, Math.min(maxVirtualScroll, nextScroll));
              });
            }}
          >
            <div className="absolute inset-0">
              {Array.from(
                { length: endRow - startRow },
                (_, i) => startRow + i,
              ).map((rowIndex) => {
                const rowOffset = rowIndex * BYTES_PER_ROW;
                const offsetInVisible = rowOffset - visibleStartOffset;

                if (
                  offsetInVisible < 0 ||
                  offsetInVisible >= visibleBuffer.length
                ) {
                  return null;
                }

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

            <VirtualScrollbar
              containerRef={containerRef}
              virtualScrollTop={virtualScrollTop}
              maxVirtualScroll={maxVirtualScroll}
              totalRows={totalRows}
              rowHeight={ROW_HEIGHT}
              containerHeight={containerHeight}
              onScrollChange={setVirtualScrollTop}
            />
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Positioner side="bottom" align="start">
            <ContextMenu.Popup className="flex flex-col text-sm bg-popover border border-border rounded-md shadow-md p-2 text-foreground">
              <ContextMenu.Item
                onClick={copyOffset}
                className="flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
              >
                <span>Copy Offset</span>
                <span className="text-xs text-muted-foreground">
                  (ALT + Insert)
                </span>
              </ContextMenu.Item>

              <ContextMenu.Item
                onClick={toggleGoToOffset}
                className="flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
              >
                <span>Go to Offset</span>
                <span className="text-xs text-muted-foreground">(ALT + G)</span>
              </ContextMenu.Item>

              {hasSelection && (
                <>
                  <ContextMenu.Separator className="my-1 border-t border-border" />

                  {hasMultiSelection && (
                    <>
                      <ContextMenu.Item
                        onClick={copySelectionHex}
                        className="flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
                      >
                        <span>Copy as Hex</span>
                        <span className="text-xs text-muted-foreground">
                          (CTRL + C)
                        </span>
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        onClick={copySelectionAscii}
                        className="flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
                      >
                        <span>Copy as ASCII</span>
                        <span className="text-xs text-muted-foreground">
                          (CTRL + Shift + C)
                        </span>
                      </ContextMenu.Item>
                    </>
                  )}

                  <ContextMenu.Separator className="my-1 border-t border-border" />

                  <ContextMenu.Item
                    onClick={pasteInSelection}
                    className="flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
                  >
                    <span>Paste in selection</span>
                    <span className="text-xs text-muted-foreground">
                      (CTRL + V)
                    </span>
                  </ContextMenu.Item>

                  <ContextMenu.Item
                    onClick={pasteIgnoringSelection}
                    className="flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
                  >
                    <span>Paste ignoring selection</span>
                    <span className="text-xs text-muted-foreground">
                      (CTRL + Shift + V)
                    </span>
                  </ContextMenu.Item>
                </>
              )}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      <GoToOffsetDialog
        open={goToOffsetOpen}
        onOpenChange={setGoToOffsetOpen}
        onGoToOffset={handleGoToOffset}
        maxOffset={Math.max(0, fileSize - 1)}
      />
    </section>
  );
}
