import { Dialog, Field } from "@base-ui/react";
import { Button } from "@base-ui/react/button";
import { Menu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { exit } from "@tauri-apps/plugin-process";
import {
	ChevronRightIcon,
	MaximizeIcon,
	MinusIcon,
	MoonIcon,
	SunIcon,
	XIcon,
} from "lucide-preact";
import { useState } from "preact/hooks";
import type { ViewMode } from "../../../App";
import { useFiles } from "../../context/FileContext";
import { useTheme } from "../../hooks/useTheme";

interface TitlebarProps {
	viewMode: string;
	setViewMode: (mode: ViewMode) => void;
	onSaveRequest: () => void;
}

const Titlebar = ({ setViewMode, onSaveRequest }: TitlebarProps) => {
	const appWindow = getCurrentWindow();
	const { theme, toggleTheme } = useTheme();
	const { openFile: addFile } = useFiles();

	const [newFileOpen, setNewFileOpen] = useState(false);

	const openFile = async () => {
		const selected = await open({
			multiple: true,
			filters: [
				{
					name: "All Files",
					extensions: ["*"],
				},
			],
		});

		if (selected) {
			try {
				for (const filePath of selected) {
					const data = await readFile(filePath);
					const fileName = filePath.split(/[\\/]/).pop() || "Unknown";
					addFile(filePath, fileName, new Uint8Array(data));
				}
			} catch (error) {
				console.error("Failed to read file:", error);
			}
		}
	};

	const createNewFile = (event: SubmitEvent) => {
		event.preventDefault();

		const form = event.currentTarget as HTMLFormElement;
		const data = new FormData(form);

		const size = Number(data.get("size"));

		if (!size || size <= 0) return;

		const buffer = new Uint8Array(size);
		const fileName = `untitled-${Date.now()}`;

		addFile(null, fileName, buffer);
		setNewFileOpen(false);
	};

	const minimizeApp = async () => {
		await appWindow.minimize();
	};

	const maximizeApp = async () => {
		await appWindow.toggleMaximize();
	};

	const closeApp = async () => {
		await exit(0);
	};
	return (
		<div class="flex w-full items-center justify-between titlebar border-b border-border bg-background">
			<Dialog.Root open={newFileOpen} onOpenChange={setNewFileOpen}>
				<Menubar className="no-drag">
					<Menu.Root>
						<Menu.Trigger className="h-8 rounded px-3 text-sm select-none text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
							File
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner className="outline-none" sideOffset={6}>
								<Menu.Popup className="origin-[var(--transform-origin)] rounded-md bg-popover text-popover-foreground py-1 shadow-lg border border-border data-[ending-style]:opacity-0 data-[ending-style]:transition-opacity data-[instant]:transition-none">
									<Menu.Item className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm mx-1">
										<Dialog.Trigger>New File</Dialog.Trigger>
									</Menu.Item>

									<Menu.Item
										onClick={openFile}
										className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm mx-1"
									>
										Open
									</Menu.Item>
									<Menu.Item
										onClick={onSaveRequest}
										className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm mx-1"
									>
										Save
									</Menu.Item>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>

					<Menu.Root>
						<Menu.Trigger className="h-8 rounded px-3 text-sm select-none text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
							View
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner className="outline-none" sideOffset={6}>
								<Menu.Popup className="origin-[var(--transform-origin)] rounded-md bg-popover text-popover-foreground py-1 shadow-lg border border-border data-[ending-style]:opacity-0 data-[ending-style]:transition-opacity data-[instant]:transition-none">
									<Menu.SubmenuRoot>
										<Menu.SubmenuTrigger className="flex w-full cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground rounded-sm">
											Layout
											<ChevronRightIcon size={14} />
										</Menu.SubmenuTrigger>

										<Menu.Portal>
											<Menu.Positioner className="outline-none">
												<Menu.Popup className="rounded-md bg-popover text-popover-foreground py-1 shadow-lg border border-border">
													<Menu.Item
														onClick={() => setViewMode("tabs")}
														className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground rounded-sm"
													>
														Tabs
													</Menu.Item>
													<Menu.Item
														onClick={() => setViewMode("mosaic")}
														className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground rounded-sm"
													>
														Mosaic
													</Menu.Item>
												</Menu.Popup>
											</Menu.Positioner>
										</Menu.Portal>
									</Menu.SubmenuRoot>
									<Menu.Item className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm mx-1">
										About
									</Menu.Item>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>
				</Menubar>

				{/* Actions (minimize, maximize, close) */}
				<div class="flex items-center gap-1 no-drag">
					<Button
						type="button"
						onClick={toggleTheme}
						class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded"
					>
						{theme === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
					</Button>

					<Button
						type="button"
						onClick={minimizeApp}
						class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded"
					>
						<MinusIcon size={16} />
					</Button>
					<Button
						onClick={maximizeApp}
						class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded"
					>
						<MaximizeIcon size={16} />
					</Button>
					<Button
						onClick={closeApp}
						class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors rounded rounded-tr-none"
					>
						<XIcon size={16} />
					</Button>
				</div>

				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />

					<Dialog.Popup
						className="
							fixed top-1/2 left-1/2
							w-96 max-w-[calc(100vw-2rem)]
							-translate-x-1/2 -translate-y-1/2
							rounded-lg
							bg-popover text-popover-foreground
							border border-border
							shadow-xl
							p-6
							outline-none
							transition-all
							data-[starting-style]:scale-95 data-[starting-style]:opacity-0
							data-[ending-style]:scale-95 data-[ending-style]:opacity-0
						"
					>
						<Dialog.Title className="text-lg font-semibold">
							New file
						</Dialog.Title>

						<Dialog.Description className="mt-2 text-sm text-muted-foreground">
							Create a new file to get started.
						</Dialog.Description>

						<form onSubmit={createNewFile}>
							<Field.Root class="flex flex-col gap-2">
								<Field.Label>File Size (bytes)</Field.Label>
								<Field.Control
									name="size"
									type="number"
									defaultValue={1024}
									min={1}
									placeholder="1024"
									className="
										h-9 rounded-md
										border border-border
										bg-background
										px-3 text-sm
										text-foreground
										focus:outline-none
										focus:ring-2 focus:ring-ring
									"
								/>
							</Field.Root>

							<div className="mt-6 flex justify-end gap-2">
								<Dialog.Close
									className="
									inline-flex h-9 items-center justify-center
									rounded-md px-4
									text-sm font-medium
									border border-border
									bg-background
									hover:bg-accent hover:text-accent-foreground
									transition-colors
								"
								>
									Cancel
								</Dialog.Close>

								<Button
									type="submit"
									className="
										inline-flex h-9 items-center justify-center
										rounded-md px-4
										text-sm font-medium
										bg-primary text-primary-foreground
										hover:bg-primary/90
										transition-colors
									"
								>
									Create
								</Button>
							</div>
						</form>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
};

export default Titlebar;
