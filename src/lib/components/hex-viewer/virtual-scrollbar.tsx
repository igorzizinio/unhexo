import { useCallback, useEffect, useState } from "preact/hooks";

interface VirtualScrollbarProps {
  containerRef: { current: HTMLDivElement | null };
  virtualScrollTop: number;
  maxVirtualScroll: number;
  totalRows: number;
  rowHeight: number;
  containerHeight: number;
  onScrollChange: (nextScrollTop: number) => void;
}

export default function VirtualScrollbar({
  containerRef,
  virtualScrollTop,
  maxVirtualScroll,
  totalRows,
  rowHeight,
  containerHeight,
  onScrollChange,
}: Readonly<VirtualScrollbarProps>) {
  const [isDragging, setIsDragging] = useState(false);

  const clampScroll = useCallback(
    (nextScroll: number) => {
      onScrollChange(Math.max(0, Math.min(maxVirtualScroll, nextScroll)));
    },
    [maxVirtualScroll, onScrollChange],
  );

  const updateScrollFromMouse = useCallback(
    (clientY: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
      const totalScrollableHeight = totalRows * rowHeight;
      const nextScroll =
        percentage * totalScrollableHeight - containerHeight / 2;
      clampScroll(nextScroll);
    },
    [clampScroll, containerRef, totalRows, rowHeight, containerHeight],
  );

  const handleTrackMouseDown = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("scrollbar-thumb")) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        return;
      }

      updateScrollFromMouse(e.clientY);
    },
    [updateScrollFromMouse],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (event: globalThis.MouseEvent) => {
      updateScrollFromMouse(event.clientY);
    };

    const onMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, updateScrollFromMouse]);

  if (maxVirtualScroll <= 0) return null;

  const thumbHeightPercent = Math.max(
    2,
    (containerHeight / (totalRows * rowHeight)) * 100,
  );
  const thumbTopPercent =
    (virtualScrollTop / maxVirtualScroll) * (100 - thumbHeightPercent);

  return (
    <button
      type="button"
      aria-controls={containerRef.current?.id}
      aria-valuenow={virtualScrollTop}
      aria-valuemin={0}
      aria-valuemax={maxVirtualScroll}
      aria-orientation="vertical"
      role="scrollbar"
      aria-label="Scrollbar track"
      className="absolute right-0 top-0 bottom-0 w-3 bg-accent/20 hover:bg-accent/30 transition-colors cursor-pointer border-0 p-0"
      onMouseDown={handleTrackMouseDown}
    >
      <div
        className="scrollbar-thumb absolute right-0 w-3 bg-primary/60 hover:bg-primary/80 cursor-grab active:cursor-grabbing transition-colors"
        style={{
          top: `${thumbTopPercent}%`,
          height: `${thumbHeightPercent}%`,
        }}
      />
    </button>
  );
}
