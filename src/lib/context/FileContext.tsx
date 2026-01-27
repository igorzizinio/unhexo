import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { createContext } from "preact";
import { useContext, useMemo, useState } from "preact/hooks";

export interface Tab {
	id: string;
	fileName: string;
	filePath: string | null;
	data: Uint8Array;
	hasChanged: boolean;
}

export interface PersistedTab {
	id: string;
	filePath: string;
	fileName: string;
	hasChanged: boolean;
}

interface FileContextType {
	tabs: Tab[];
	activeTabId: string | null;
	activeTab: Tab | null;
	openFile: (
		filePath: string | null,
		fileName: string,
		data: Uint8Array,
	) => void;
	closeTab: (id: string) => void;
	setActiveTab: (id: string) => void;
	markAsChanged: (id: string, hasChanged: boolean) => void;
	saveTab: (id: string, data: Uint8Array) => Promise<void>;
}

const FileContext = createContext<FileContextType | null>(null);

export function FileProvider({
	children,
}: Readonly<{
	children: preact.ComponentChildren;
}>) {
	const [tabs, setTabs] = useState<Tab[]>([]);
	const [activeTabId, setActiveTabId] = useState<string | null>(null);

	const activeTab = useMemo(
		() => tabs.find((tab) => tab.id === activeTabId) ?? null,
		[tabs, activeTabId],
	);

	const openFile = (
		filePath: string | null,
		fileName: string,
		data: Uint8Array,
	) => {
		const existing = tabs.find((tab) => tab.filePath === filePath);

		if (existing) {
			setActiveTabId(existing.id);
		} else {
			const newTab: Tab = {
				id: crypto.randomUUID(),
				fileName,
				filePath,
				data,
				hasChanged: false,
			};
			setTabs((prev) => [...prev, newTab]);
			setActiveTabId(newTab.id);
		}
	};

	const closeTab = (id: string) => {
		const index = tabs.findIndex((tab) => tab.id === id);
		const filtered = tabs.filter((tab) => tab.id !== id);

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

	const saveTab = async (id: string, data: Uint8Array) => {
		const tab = tabs.find((t) => t.id === id);
		if (!tab) return;

		const path = tab.filePath ?? (await save());

		if (!path) throw new Error("No file path specified.");

		await writeFile(path, data);

		setTabs((prev) =>
			prev.map((t) => (t.id === id ? { ...t, data, hasChanged: false } : t)),
		);
	};

	const markAsChanged = (id: string, hasChanged: boolean) => {
		setTabs((prev) =>
			prev.map((tab) => (tab.id === id ? { ...tab, hasChanged } : tab)),
		);
	};

	const value = useMemo(
		() => ({
			tabs,
			activeTabId,
			activeTab,
			openFile,
			closeTab,
			setActiveTab: setActiveTabId,
			markAsChanged,
			saveTab,
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
