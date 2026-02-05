import { ContextMenu, ScrollArea } from "@base-ui/react";
import { XIcon } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { Tab } from "@/lib/context/FileContext";

interface TabsProps {
	tabs: Tab[];
	activeTabId: string | null;
	onTabClick: (id: string) => void;
	onTabClose: (id: string) => void;
	onTabCloseAll: () => void;
}

export function Tabs({
	tabs,
	activeTabId,
	onTabClick,
	onTabClose,
	onTabCloseAll,
}: TabsProps) {
	if (tabs.length === 0) {
		return null;
	}

	const handleClose = (tabId: string) => {
		onTabClose(tabId);
	};

	const handleCloseAll = () => {
		onTabCloseAll();
	};
	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				<ScrollArea.Root className="w-screen">
					<ScrollArea.Scrollbar
						orientation="horizontal"
						className="m-2 flex w-1 justify-center rounded bg-muted opacity-0 transition-opacity pointer-events-none data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:pointer-events-auto data-[scrolling]:opacity-100 data-[scrolling]:duration-0 data-[scrolling]:pointer-events-auto"
					>
						<ScrollArea.Thumb className="w-full rounded bg-muted-foreground" />
					</ScrollArea.Scrollbar>
					<ScrollArea.Viewport className="flex items-center w-full gap-1 bg-muted/30 border-b border-border px-2">
						{tabs.map((tab) => {
							const isActive = tab.id === activeTabId;
							return (
								<ContextMenu.Root>
									<ContextMenu.Trigger>
										<div
											role="tab"
											aria-selected={isActive}
											tabIndex={isActive ? 0 : -1}
											title={tab.filePath ?? undefined}
											className={`
								flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer border-b-2 min-w-28 w-46 text-ellipsis overflow-hidden
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
											<span className="whitespace-nowrap text-xs overflow-hidden text-ellipsis">
												{tab.fileName}
											</span>

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
												className={`
									rounded p-0.5
									${isActive ? "hover:bg-accent" : "hover:bg-primary-foreground"}
								`}
											>
												<XIcon size={14} />
											</button>
										</div>
									</ContextMenu.Trigger>

									<ContextMenu.Portal>
										<ContextMenu.Positioner side="bottom" align="start">
											<ContextMenu.Popup className="flex flex-col text-sm bg-popover border border-border rounded-md shadow-md p-2 text-foreground">
												<ContextMenu.Item
													onClick={() => handleClose(tab.id)}
													className="flex p-2 items-center justify-between gap-4 cursor-pointer hover:bg-accent rounded-md"
												>
													Close
												</ContextMenu.Item>
											</ContextMenu.Popup>
										</ContextMenu.Positioner>
									</ContextMenu.Portal>
								</ContextMenu.Root>
							);
						})}
					</ScrollArea.Viewport>
				</ScrollArea.Root>

				{/*
					TODO: one todo for the tab bar
					Should have: close, close all, close saved | copy filepath | new file, open file
				*/}

				<ContextMenu.Portal>
					<ContextMenu.Positioner side="bottom" align="start">
						<ContextMenu.Popup className="flex flex-col text-sm bg-popover border border-border rounded-md shadow-md p-2 text-foreground"></ContextMenu.Popup>
					</ContextMenu.Positioner>
				</ContextMenu.Portal>
			</ContextMenu.Trigger>
		</ContextMenu.Root>
	);
}
