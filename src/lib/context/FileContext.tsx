import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { createContext } from "preact";
import { useContext, useMemo } from "preact/hooks";
import { useFileBuffer } from "../hooks/useFileBuffer";
import { usePersistedState } from "../hooks/usePersistedState";
import { applyChangeSetChunked } from "../utils/changeSet";

export interface Tab {
	id: string;
	fileName: string;
	filePath: string | null;
	fileSize: number;
	changeSet: Record<number, number>; // byte offset to new byte value
	isTempFile?: boolean; // Flag to indicate if this is a temporary file
	version?: number; // Incremented on save to trigger buffer reload
}

export interface PersistedTab {
	id: string;
	filePath: string;
	fileName: string;
}

interface FileContextType {
	tabs: Tab[];
	activeTabId: string | null;
	activeTab: Tab | null;
	openFile: (file: Partial<Tab> & { data?: Uint8Array }) => void;
	closeTab: (id: string) => Promise<void>;
	setActiveTab: (id: string) => void;
	saveTab: (id: string) => Promise<void>;
	updateChangeSet: (id: string, offset: number, value: number) => void;
	clearChangeSet: (id: string) => void;
}

const FileContext = createContext<FileContextType | null>(null);

export function FileProvider({
	children,
}: Readonly<{
	children: preact.ComponentChildren;
}>) {
	const [tabs, setTabs] = usePersistedState<Tab[]>("openTabs", []);
	const [activeTabId, setActiveTabId] = usePersistedState<string | null>(
		"activeTabId",
		null,
	);

	const fileBuffer = useFileBuffer();

	const activeTab = useMemo(
		() => tabs.find((tab) => tab.id === activeTabId) ?? null,
		[tabs, activeTabId],
	);

	const openFile = ({
		filePath,
		fileName,
		fileSize,
		data,
		isTempFile,
	}: Partial<Tab> & { data?: Uint8Array }) => {
		const existing = tabs.find((tab) => tab.filePath === filePath);

		if (existing) {
			setActiveTabId(existing.id);
		} else {
			const newTab: Tab = {
				id: crypto.randomUUID(),
				fileName: fileName ?? "Untitled",
				filePath: filePath ?? null,
				fileSize: fileSize ?? data?.length ?? 0,
				changeSet: {},
				isTempFile: isTempFile ?? false,
				version: 0,
			};
			setTabs((prev) => [...prev, newTab]);
			setActiveTabId(newTab.id);
		}
	};

	const closeTab = async (id: string) => {
		const index = tabs.findIndex((tab) => tab.id === id);
		const tab = tabs[index];
		const filtered = tabs.filter((tab) => tab.id !== id);

		// Delete temp file if it exists
		if (tab?.isTempFile && tab.filePath) {
			await invoke("delete_temp_file", { path: tab.filePath }).catch((err) => {
				console.error("Failed to delete temp file:", err);
			});
		}

		setTabs(filtered);

		if (activeTabId === id) {
			if (filtered.length > 0) {
				const nextIndex = Math.max(0, index - 1);
				setActiveTabId(filtered[nextIndex].id);
			} else {
				setActiveTabId(null);
			}
		}
	};

	const updateChangeSet = (id: string, offset: number, value: number) => {
		setTabs((prev) =>
			prev.map((tab) => {
				if (tab.id !== id) return tab;
				return { ...tab, changeSet: { ...tab.changeSet, [offset]: value } };
			}),
		);
	};

	const clearChangeSet = (id: string) => {
		setTabs((prev) =>
			prev.map((tab) => {
				if (tab.id !== id) return tab;
				return { ...tab, changeSet: {}, version: (tab.version ?? 0) + 1 };
			}),
		);
	};

	const saveTab = async (id: string) => {
		const tab = tabs.find((t) => t.id === id);
		if (!tab) {
			console.error("Cannot save: tab not found");
			return;
		}

		try {
			// For temp files or files without a path, prompt for save location
			let savePath = tab.filePath;
			if (tab.isTempFile || !tab.filePath) {
				const newPath = await save({
					defaultPath: tab.fileName,
					filters: [
						{
							name: "All Files",
							extensions: ["*"],
						},
					],
				});
				if (!newPath) {
					console.log("Save cancelled");
					return;
				}
				savePath = newPath;
			}

			if (!savePath) {
				throw new Error("No file path specified.");
			}

			// Open file buffer if not already open
			if (!fileBuffer.isReady || fileBuffer.filePath !== tab.filePath) {
				if (tab.filePath) {
					await fileBuffer.openFile(tab.filePath);
				}
			}

			// Apply changeSet to get final data
			const finalData = await applyChangeSetChunked(
				(offset, length) => fileBuffer.readBytes(offset, length),
				tab.fileSize,
				tab.changeSet,
			);

			console.log("Saving to", savePath);

			// Write file
			await writeFile(savePath, finalData);

			// If it was a temp file, delete the old temp file and update the tab
			if (tab.isTempFile && tab.filePath && tab.filePath !== savePath) {
				await invoke("delete_temp_file", { path: tab.filePath }).catch(
					(err) => {
						console.warn("Failed to delete old temp file:", err);
					},
				);

				// Update the tab with the new permanent path
				setTabs((prev) =>
					prev.map((t) =>
						t.id === id
							? {
									...t,
									filePath: savePath,
									fileName: savePath?.split(/[\\/]/).pop() || t.fileName,
									isTempFile: false,
									changeSet: {},
								}
							: t,
					),
				);
			} else {
				// Clear changeSet for regular saves
				clearChangeSet(id);
			}
		} catch (error) {
			console.error("Error saving file:", error);
			throw error;
		}
	};

	const value = useMemo(
		() => ({
			tabs,
			activeTabId,
			activeTab,
			openFile,
			closeTab,
			setActiveTab: setActiveTabId,
			saveTab,
			updateChangeSet,
			clearChangeSet,
		}),
		[tabs, activeTabId, activeTab],
	);

	return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}

export function useFiles() {
	const context = useContext(FileContext);
	if (!context) {
		throw new Error("useFiles must be used within a FileProvider");
	}
	return context;
}
