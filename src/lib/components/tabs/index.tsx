import { XIcon } from "lucide-preact";

export interface Tab {
	id: string;
	fileName: string;
	filePath: string;
	data: Uint8Array;
}

interface TabsProps {
	tabs: Tab[];
	activeTabId: string | null;
	onTabClick: (id: string) => void;
	onTabClose: (id: string) => void;
}

export function Tabs({ tabs, activeTabId, onTabClick, onTabClose }: TabsProps) {
	if (tabs.length === 0) {
		return null;
	}

	return (
		<div className="flex items-center gap-1 bg-muted/30 border-b border-border px-2 overflow-x-auto">
			{tabs.map((tab) => {
				const isActive = tab.id === activeTabId;
				return (
					<div
						role="tab"
						aria-selected={isActive}
						tabIndex={isActive ? 0 : -1}
						className={`
    flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-b-2
    select-none
    ${
			isActive
				? "border-primary bg-background text-foreground"
				: "border-transparent hover:bg-accent text-muted-foreground"
		}
  `}
						onClick={() => onTabClick(tab.id)}
						onMouseDown={(e) => {
							// botão do meio do mouse
							if (e.button === 1) {
								e.preventDefault();
								onTabClose(tab.id);
							}
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onTabClick(tab.id);
							}
						}}
					>
						<span className="whitespace-nowrap">{tab.fileName}</span>

						<button
							type="button"
							aria-label={`Fechar ${tab.fileName}`}
							onMouseDown={(e) => {
								// impede que o middle click feche duas vezes
								e.stopPropagation();
							}}
							onClick={(e) => {
								e.stopPropagation();
								onTabClose(tab.id);
							}}
							className="hover:bg-muted rounded p-0.5"
						>
							<XIcon size={14} />
						</button>
					</div>
				);
			})}
		</div>
	);
}
