import { ContextMenu } from "@base-ui/react/context-menu";
import { useCallback, useEffect, useRef, useState } from "react";

interface HexViewerProps {
  data: Uint8Array | null;
  fileName?: string;
}

const ROW_HEIGHT = 24;
const BYTES_PER_ROW = 16;
const OVERSCAN = 15; // Linhas extras para renderizar acima e abaixo

export function HexViewer({ data, fileName }: HexViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const [selectedByte, setSelectedByte] = useState<number | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // ResizeObserver para altura do container
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    updateSize();

    return () => ro.disconnect();
  }, []);

  // Mouse up global
  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No file opened
      </div>
    );
  }

  const totalRows = Math.ceil(data.length / BYTES_PER_ROW);
  const totalHeight = totalRows * ROW_HEIGHT;

  // Calcular quais linhas renderizar
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
  );

  const visibleRows = [];
  for (let i = startRow; i < endRow; i++) {
    visibleRows.push(i);
  }

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleByteMouseDown = useCallback((byteIndex: number) => {
    setIsSelecting(true);
    setSelectionStart(byteIndex);
    setSelectionEnd(byteIndex);
    setSelectedByte(byteIndex);
  }, []);

  const handleByteMouseEnter = useCallback(
    (byteIndex: number) => {
      if (isSelecting && selectionStart !== null) {
        setSelectionEnd(byteIndex);
      }
    },
    [isSelecting, selectionStart],
  );

  const isByteSelected = useCallback(
    (byteIndex: number) => {
      if (selectionStart === null || selectionEnd === null) return false;
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      return byteIndex >= start && byteIndex <= end;
    },
    [selectionStart, selectionEnd],
  );

  const copyOffset = () => {
    if (selectedByte !== null) {
      navigator.clipboard.writeText(
        `0x${selectedByte.toString(16).padStart(8, "0").toUpperCase()}`,
      );
    }
  };

  const copySelectionHex = () => {
    if (selectionStart === null || selectionEnd === null) return;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const hex = Array.from(data.slice(start, end + 1))
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    navigator.clipboard.writeText(hex);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {fileName && (
        <div className="px-4 py-2 border-b border-border bg-muted/50 shrink-0">
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {data.length.toLocaleString()} bytes
          </p>
        </div>
      )}

      <div className="bg-muted border-b border-border px-4 py-2 flex gap-4 font-mono text-xs shrink-0">
        <div className="w-20">Offset</div>
        <div className="flex gap-2">
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
            className="h-full w-full overflow-y-auto overflow-x-hidden"
            onScroll={handleScroll}
          >
            <div
              style={{
                height: totalHeight,
                position: "relative",
                minHeight: "100%",
              }}
            >
              {visibleRows.map((rowIndex) => (
                <HexRow
                  key={rowIndex}
                  index={rowIndex}
                  data={data}
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
            <ContextMenu.Popup className="rounded-md bg-popover py-1 shadow-lg border border-border min-w-45">
              <ContextMenu.Item
                onClick={copyOffset}
                className="px-4 py-2 text-sm hover:bg-accent rounded-sm mx-1"
              >
                Copy Offset
              </ContextMenu.Item>

              {selectionStart !== selectionEnd && (
                <ContextMenu.Item
                  onClick={copySelectionHex}
                  className="px-4 py-2 text-sm hover:bg-accent rounded-sm mx-1"
                >
                  Copy as Hex
                </ContextMenu.Item>
              )}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
}

// Componente de linha otimizado
const HexRow = ({
  index,
  data,
  offsetTop,
  isByteSelected,
  onByteMouseDown,
  onByteMouseEnter,
}: {
  index: number;
  data: Uint8Array;
  offsetTop: number;
  isByteSelected: (i: number) => boolean;
  onByteMouseDown: (i: number) => void;
  onByteMouseEnter: (i: number) => void;
}) => {
  const offset = index * BYTES_PER_ROW;

  return (
    <div
      style={{
        position: "absolute",
        top: offsetTop,
        left: 0,
        right: 0,
        height: ROW_HEIGHT,
      }}
      className="flex gap-4 px-4 font-mono text-xs hover:bg-accent/30"
    >
      <div className="w-20 text-muted-foreground flex items-center">
        {offset.toString(16).padStart(8, "0").toUpperCase()}
      </div>

      <div className="flex items-center">
        {Array.from({ length: BYTES_PER_ROW }, (_, i) => {
          const globalIndex = offset + i;
          if (globalIndex >= data.length) {
            return (
              <span
                key={i}
                className="w-6 text-center text-muted-foreground/30"
              >
                {" "}
              </span>
            );
          }

          const byte = data[globalIndex];
          const selected = isByteSelected(globalIndex);

          return (
            <span
              key={i}
              onMouseDown={() => onByteMouseDown(globalIndex)}
              onMouseEnter={() => onByteMouseEnter(globalIndex)}
              className={`w-6 text-center cursor-pointer select-none ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {byte.toString(16).padStart(2, "0").toUpperCase()}
            </span>
          );
        })}
      </div>

      <div className="flex text-muted-foreground items-center">
        {Array.from({ length: BYTES_PER_ROW }, (_, i) => {
          const globalIndex = offset + i;
          if (globalIndex >= data.length) {
            return <span key={i}> </span>;
          }

          const byte = data[globalIndex];
          const selected = isByteSelected(globalIndex);
          const char =
            byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";

          return (
            <span
              key={i}
              onMouseDown={() => onByteMouseDown(globalIndex)}
              onMouseEnter={() => onByteMouseEnter(globalIndex)}
              className={`cursor-pointer select-none ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
};
