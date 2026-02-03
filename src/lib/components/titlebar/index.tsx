import { Separator } from "@base-ui/react";
import { Menubar } from "@base-ui/react/menubar";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";
import { useState } from "preact/hooks";
import About from "@/lib/components/about";
import {
	MenubarItem,
	MenubarMenu,
	MenubarSubmenu,
} from "@/lib/components/ui/menubar-menu";
import { NewFileDialog } from "@/lib/components/ui/new-file-dialog";
import { WindowControls } from "@/lib/components/ui/window-controls";
import { useFiles } from "@/lib/context/FileContext";
import { THEMES, useTheme } from "@/lib/hooks/useTheme";
import type { ViewMode } from "@/types";

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
					// Open file handle and get file size
					const info = await invoke<{ size: number }>("open_file_handle", {
						path: filePath,
					});

					const fileName = filePath.split(/[\\/]/).pop() || "Unknown";

					addFile({
						filePath,
						fileName,
						fileSize: info.size,
					});
				}
			} catch (error) {
				console.error("Failed to open file:", error);
			}
		}
	};

	const createNewFile = async (size: number) => {
		try {
			// Create a temporary file on disk
			const tempPath = await invoke<string>("create_temp_file", { size });
			const fileName = `untitled-${Date.now()}.bin`;

			// Open the temp file as a new tab
			addFile({
				fileName,
				filePath: tempPath,
				fileSize: size,
				isTempFile: true,
			});
		} catch (error) {
			console.error("Failed to create new file:", error);
		}
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
