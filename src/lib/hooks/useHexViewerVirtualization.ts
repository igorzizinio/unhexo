import { useCallback, useEffect, useState } from "preact/hooks";

interface UseHexViewerVirtualizationProps {
  fileSize: number;
  isBufferReady: boolean;
  readBytes: (offset: number, length: number) => Promise<Uint8Array>;
  preloadRange: (startOffset: number, endOffset: number) => Promise<void>;
}

const ROW_HEIGHT = 24;
const BYTES_PER_ROW = 16;
const OVERSCAN = 40;
const PRELOAD_ROWS = 100;

export function useHexViewerVirtualization({
  fileSize,
  isBufferReady,
  readBytes,
  preloadRange,
}: Readonly<UseHexViewerVirtualizationProps>) {
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [visibleBuffer, setVisibleBuffer] = useState<Uint8Array>(
    new Uint8Array(0),
  );
  const [visibleStartOffset, setVisibleStartOffset] = useState(0);

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

  useEffect(() => {
    if (!isBufferReady) return;

    const loadVisibleData = async () => {
      const startOffset = startRow * BYTES_PER_ROW;
      const endOffset = Math.min(fileSize, endRow * BYTES_PER_ROW);
      const length = endOffset - startOffset;

      if (length <= 0) {
        setVisibleBuffer(new Uint8Array(0));
        setVisibleStartOffset(startOffset);
        return;
      }

      const data = await readBytes(startOffset, length);
      setVisibleBuffer(data);
      setVisibleStartOffset(startOffset);

      const preloadEndOffset = Math.min(
        fileSize,
        endOffset + PRELOAD_ROWS * BYTES_PER_ROW,
      );
      if (preloadEndOffset > endOffset) {
        await preloadRange(endOffset, preloadEndOffset);
      }
    };

    loadVisibleData();
  }, [
    containerHeight,
    endRow,
    fileSize,
    isBufferReady,
    preloadRange,
    readBytes,
    startRow,
  ]);

  const scrollToOffset = useCallback((offset: number) => {
    const rowIndex = Math.floor(offset / BYTES_PER_ROW);
    setVirtualScrollTop(rowIndex * ROW_HEIGHT);
  }, []);

  const ensureOffsetVisible = useCallback(
    (offset: number) => {
      const rowIndex = Math.floor(offset / BYTES_PER_ROW);
      const byteTop = rowIndex * ROW_HEIGHT;
      const byteBottom = byteTop + ROW_HEIGHT;

      setVirtualScrollTop((currentScroll) => {
        const viewTop = currentScroll;
        const viewBottom = viewTop + containerHeight;

        if (byteTop < viewTop) return byteTop;
        if (byteBottom > viewBottom) return byteBottom - containerHeight;
        return currentScroll;
      });
    },
    [containerHeight],
  );

  return {
    virtualScrollTop,
    setVirtualScrollTop,
    containerHeight,
    setContainerHeight,
    visibleBuffer,
    visibleStartOffset,
    visibleLength: visibleBuffer.length,
    totalRows,
    maxVirtualScroll,
    startRow,
    endRow,
    scrollToOffset,
    ensureOffsetVisible,
    ROW_HEIGHT,
    BYTES_PER_ROW,
  };
}
