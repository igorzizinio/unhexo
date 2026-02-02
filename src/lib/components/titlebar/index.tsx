import { Separator } from "@base-ui/react";
import { Menubar } from "@base-ui/react/menubar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { exit } from "@tauri-apps/plugin-process";
import { useState } from "preact/hooks";
import type { ViewMode } from "../../../types";
import { useFiles } from "../../context/FileContext";
import { THEMES, useTheme } from "../../hooks/useTheme";
import About from "../about";
import { MenubarItem, MenubarMenu, MenubarSubmenu } from "../ui/menubar-menu";
import { NewFileDialog } from "../ui/new-file-dialog";
import { WindowControls } from "../ui/window-controls";

interface TitlebarProps {
	viewMode: ViewMode;
	setViewMode: (mode: ViewMode) => void;
	onSaveRequest: () => void;
}

const Titlebar = ({ setViewMode, onSaveRequest }: TitlebarProps) => {
	const appWindow = getCurrentWindow();
	const { theme, toggleTheme, setTheme } = useTheme();
	const { openFile: addFile } = useFiles();

	const [newFileOpen, setNewFileOpen] = useState(false);
	const [aboutOpen, setAboutOpen] = useState(false);

	const openFile = async () => {
		const selected = await open({
			multiple: true,
			filters: [
				{
					name: "All Files",
					extensions: [],
				},
			],
		});

		if (selected) {
			try {
				for (const filePath of selected) {
					const data = await readFile(filePath);
					const fileName = filePath.split(/[\\/]/).pop() || "Unknown";
					addFile({
						filePath,
						fileName,
						data: new Uint8Array(data),
					});
				}
			} catch (error) {
				console.error("Failed to read file:", error);
			}
		}
	};

	const createNewFile = (size: number) => {
		const buffer = new Uint8Array(size);
		const fileName = `untitled-${Date.now()}`;

		addFile({ fileName, data: buffer, hasChanged: true });
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
			<Menubar className="no-drag">
				<MenubarMenu label="File">
					<MenubarItem onClick={() => setNewFileOpen(true)}>
						New File
					</MenubarItem>

					<MenubarItem onClick={openFile}>Open</MenubarItem>
					<MenubarItem onClick={onSaveRequest}>Save</MenubarItem>
					<Separator className="my-1 h-px w-full bg-border" />
					<MenubarItem onClick={closeApp}>Exit</MenubarItem>
				</MenubarMenu>

				<MenubarMenu label="View">
					<MenubarSubmenu label="Layout">
						<MenubarItem onClick={() => setViewMode("tabs")}>Tabs</MenubarItem>
						<MenubarItem onClick={() => setViewMode("mosaic")}>
							Mosaic
						</MenubarItem>
					</MenubarSubmenu>
					<Separator className="my-1 h-px w-full bg-border" />
					<MenubarSubmenu label="Theme">
						{THEMES.map((t) => (
							<MenubarItem key={t} onClick={() => setTheme(t)}>
								{t
									.split("-")
									.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
									.join(" ")}
								{theme === t && " ✓"}
							</MenubarItem>
						))}
					</MenubarSubmenu>
					<Separator className="my-1 h-px w-full bg-border" />
					<MenubarItem onClick={() => setAboutOpen(true)}>About</MenubarItem>
				</MenubarMenu>
			</Menubar>

			<WindowControls
				theme={theme}
				onToggleTheme={toggleTheme}
				onMinimize={minimizeApp}
				onMaximize={maximizeApp}
				onClose={closeApp}
			/>

			<NewFileDialog
				open={newFileOpen}
				onOpenChange={setNewFileOpen}
				onCreateFile={createNewFile}
			/>

			<About open={aboutOpen} onOpenChange={setAboutOpen} />
		</div>
	);
};

export default Titlebar;
