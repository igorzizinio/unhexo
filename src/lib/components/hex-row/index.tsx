interface HexRowProps {
	index: number;
	data: Uint8Array;
	offsetTop: number;
	isByteSelected: (i: number) => boolean;
	onByteMouseDown: (i: number) => void;
	onByteMouseEnter: (i: number) => void;
	diffSet?: Set<number> | null;
	bytesPerRow: number;
}

export default function HexRow({
	index,
	data,
	offsetTop,
	isByteSelected,
	onByteMouseDown,
	onByteMouseEnter,
	diffSet,
	bytesPerRow,
}: Readonly<HexRowProps>) {
	const offset = index * bytesPerRow;

	return (
		<div
			style={{ top: offsetTop }}
			className="absolute left-0 right-0 h-6 flex gap-4 px-4 font-mono text-xs hover:bg-accent/50 transition-colors"
		>
			<div className="flex w-20 text-muted-foreground select-none items-center">
				{offset.toString(16).padStart(8, "0").toUpperCase()}
			</div>

			<div className="flex select-none">
				{Array.from({ length: bytesPerRow }, (_, i) => {
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
							className={`w-6 h-6 rounded transition-colors ${
								isByteSelected(idx)
									? "bg-primary text-primary-foreground font-semibold"
									: diffSet?.has(idx)
										? "bg-highlight text-highlight-foreground font-bold"
										: "hover:bg-accent hover:text-accent-foreground"
							}`}
						>
							{data[idx].toString(16).padStart(2, "0").toUpperCase()}
						</button>
					);
				})}
			</div>

			<div className="flex flex-1 items-center pl-2 select-none">
				{Array.from({ length: bytesPerRow }, (_, i) => {
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
							className={`text-center inline-block w-4 rounded transition-colors ${
								isByteSelected(idx)
									? "bg-primary text-primary-foreground font-semibold"
									: diffSet?.has(idx)
										? "bg-highlight text-highlight-foreground font-bold"
										: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							}`}
						>
							{char}
						</span>
					);
				})}
			</div>
		</div>
	);
}
