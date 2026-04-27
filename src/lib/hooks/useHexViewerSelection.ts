import { useCallback, useState } from "preact/hooks";
import {
  copyToClipboard,
  formatBytesAsAscii,
  formatBytesAsHex,
  formatOffsetAsHex,
  parseHexBytesFromClipboard,
  readFromClipboard,
} from "@/lib/utils/clipboard";

interface UseHexViewerSelectionProps {
  fileSize: number;
  changeSet: Record<number, number>;
  visibleBuffer: Uint8Array;
  visibleStartOffset: number;
  fileBuffer: {
    readBytes: (offset: number, length: number) => Promise<Uint8Array>;
  };
  tabId: string;
  updateChangeSet: (
    tabId: string,
    offset: number,
    value: number,
    previousValue: number,
  ) => void;
  undoChangeSet: (tabId: string) => number | null;
  containerHeight: number;
  bytesPerRow: number;
  rowHeight: number;
  onToggleGoTo: () => void;
}

export function useHexViewerSelection({
  fileSize,
  changeSet,
  visibleBuffer,
  visibleStartOffset,
  fileBuffer,
  tabId,
  updateChangeSet,
  undoChangeSet,
  containerHeight,
  bytesPerRow,
  rowHeight,
  onToggleGoTo,
}: Readonly<UseHexViewerSelectionProps>) {
  const [selectedByte, setSelectedByte] = useState<number | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hexNibble, setHexNibble] = useState<"high" | "low">("high");

  const resetSelection = useCallback(() => {
    setSelectedByte(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setHexNibble("high");
  }, []);

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
    [selectionEnd, selectionStart],
  );

  const getByteValue = useCallback(
    (byteIndex: number): number => {
      if (byteIndex in changeSet) return changeSet[byteIndex];

      const offsetInVisible = byteIndex - visibleStartOffset;
      if (offsetInVisible >= 0 && offsetInVisible < visibleBuffer.length) {
        return visibleBuffer[offsetInVisible];
      }

      return 0;
    },
    [changeSet, visibleBuffer, visibleStartOffset],
  );

  const copyOffset = useCallback(async () => {
    if (selectedByte === null) return;
    await copyToClipboard(formatOffsetAsHex(selectedByte));
  }, [selectedByte]);

  const copySelectionHex = useCallback(async () => {
    if (selectionStart === null || selectionEnd === null) return;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const data = await fileBuffer.readBytes(start, end - start + 1);
    await copyToClipboard(formatBytesAsHex(data));
  }, [fileBuffer, selectionEnd, selectionStart]);

  const copySelectionAscii = useCallback(async () => {
    if (selectionStart === null || selectionEnd === null) return;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const data = await fileBuffer.readBytes(start, end - start + 1);
    await copyToClipboard(formatBytesAsAscii(data));
  }, [fileBuffer, selectionEnd, selectionStart]);

  const pasteInSelection = useCallback(async () => {
    if (selectionStart === null || selectionEnd === null) return;
    const clipboardText = await readFromClipboard();
    const bytes = parseHexBytesFromClipboard(clipboardText);
    if (bytes.length === 0) return;

    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const maxBytesBySelection = end - start + 1;
    const maxBytesByFile = Math.max(0, fileSize - start);
    const bytesToWrite = Math.min(
      bytes.length,
      maxBytesBySelection,
      maxBytesByFile,
    );

    for (let i = 0; i < bytesToWrite; i++) {
      const offset = start + i;
      const previousValue = getByteValue(offset);
      updateChangeSet(tabId, offset, bytes[i], previousValue);
    }

    if (bytesToWrite > 0) {
      const last = start + bytesToWrite - 1;
      setSelectedByte(last);
      setSelectionStart(start);
      setSelectionEnd(last);
      setHexNibble("high");
    }
  }, [
    fileSize,
    getByteValue,
    selectionEnd,
    selectionStart,
    tabId,
    updateChangeSet,
  ]);

  const pasteIgnoringSelection = useCallback(async () => {
    const start = selectionStart ?? selectedByte;
    if (start === null) return;

    const clipboardText = await readFromClipboard();
    const bytes = parseHexBytesFromClipboard(clipboardText);
    if (bytes.length === 0) return;

    const maxBytesByFile = Math.max(0, fileSize - start);
    const bytesToWrite = Math.min(bytes.length, maxBytesByFile);

    for (let i = 0; i < bytesToWrite; i++) {
      const offset = start + i;
      const previousValue = getByteValue(offset);
      updateChangeSet(tabId, offset, bytes[i], previousValue);
    }

    if (bytesToWrite > 0) {
      const last = start + bytesToWrite - 1;
      setSelectedByte(last);
      setSelectionStart(start);
      setSelectionEnd(last);
      setHexNibble("high");
    }
  }, [
    fileSize,
    getByteValue,
    selectedByte,
    selectionStart,
    tabId,
    updateChangeSet,
  ]);

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault();
            e.shiftKey ? await copySelectionAscii() : await copySelectionHex();
            return;
          case "z": {
            e.preventDefault();
            const undoneOffset = undoChangeSet(tabId);

            if (undoneOffset !== null) {
              setSelectedByte(undoneOffset);
              setSelectionStart(undoneOffset);
              setSelectionEnd(undoneOffset);
              setHexNibble("high");
            }

            return;
          }
          case "a":
            e.preventDefault();
            setSelectionStart(0);
            setSelectionEnd(fileSize - 1);
            return;
          case "g":
            e.preventDefault();
            onToggleGoTo();
            return;
          case "v":
            e.preventDefault();
            if (e.shiftKey) {
              await pasteIgnoringSelection();
            } else {
              await pasteInSelection();
            }
            return;
        }
      }

      if (e.altKey && e.key === "Insert") {
        e.preventDefault();
        await copyOffset();
        return;
      }

      if (e.key === "Escape") {
        resetSelection();
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

          if (selectedByte < fileSize - 1) {
            const next = selectedByte + 1;
            setSelectedByte(next);
            setSelectionStart(next);
            setSelectionEnd(next);
          }
        }

        updateChangeSet(tabId, selectedByte, newByte, oldByte);
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
          newIndex = Math.min(selectedByte + bytesPerRow, fileSize - 1);
          break;
        case "ArrowUp":
          newIndex = Math.max(selectedByte - bytesPerRow, 0);
          break;
        case "PageDown":
          newIndex = Math.min(
            selectedByte +
              bytesPerRow * Math.floor(containerHeight / rowHeight),
            fileSize - 1,
          );
          break;
        case "PageUp":
          newIndex = Math.max(
            selectedByte -
              bytesPerRow * Math.floor(containerHeight / rowHeight),
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

      if (e.shiftKey) {
        if (selectionStart === null) setSelectionStart(selectedByte);
        setSelectionEnd(newIndex);
      } else {
        setSelectionStart(newIndex);
        setSelectionEnd(newIndex);
      }

      setHexNibble("high");
    },
    [
      bytesPerRow,
      containerHeight,
      copyOffset,
      copySelectionAscii,
      copySelectionHex,
      fileSize,
      getByteValue,
      hexNibble,
      onToggleGoTo,
      pasteIgnoringSelection,
      pasteInSelection,
      undoChangeSet,
      resetSelection,
      rowHeight,
      selectedByte,
      selectionStart,
      tabId,
      updateChangeSet,
    ],
  );

  return {
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
  };
}
