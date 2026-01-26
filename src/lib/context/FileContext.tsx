import { createContext } from "preact";
import { useContext, useState } from "preact/hooks";
import type { Tab } from "../components/tabs";

interface FileContextType {
	tabs: Tab[];
	activeTabId: string | null;
	openFile: (filePath: string, fileName: string, data: Uint8Array) => void;
	closeTab: (id: string) => void;
	setActiveTab: (id: string) => void;
	getActiveTab: () => Tab | null;
}

const FileContext = createContext<FileContextType | null>(null);

export function FileProvider({
	children,
}: {
	children: preact.ComponentChildren;
}) {
	const [tabs, setTabs] = useState<Tab[]>([]);
	const [activeTabId, setActiveTabId] = useState<string | null>(null);

	const openFile = (filePath: string, fileName: string, data: Uint8Array) => {
		// Check if file is already open
		const existingTab = tabs.find((tab) => tab.filePath === filePath);
		if (existingTab) {
			setActiveTabId(existingTab.id);
			return;
		}

		// Create new tab
		const newTab: Tab = {
			id: crypto.randomUUID(),
			fileName,
			filePath,
			data,
		};

		setTabs((prev) => [...prev, newTab]);
		setActiveTabId(newTab.id);
	};

	const closeTab = (id: string) => {
		setTabs((prev) => {
			const filtered = prev.filter((tab) => tab.id !== id);

			// If we're closing the active tab, switch to another one
			if (activeTabId === id && filtered.length > 0) {
				const index = prev.findIndex((tab) => tab.id === id);
				const nextTab = filtered[Math.max(0, index - 1)];
				setActiveTabId(nextTab.id);
			} else if (filtered.length === 0) {
				setActiveTabId(null);
			}

			return filtered;
		});
	};

	const setActiveTab = (id: string) => {
		setActiveTabId(id);
	};

	const getActiveTab = () => {
		return tabs.find((tab) => tab.id === activeTabId) || null;
	};

	return (
		<FileContext.Provider
			value={{
				tabs,
				activeTabId,
				openFile,
				closeTab,
				setActiveTab,
				getActiveTab,
			}}
		>
			{children}
		</FileContext.Provider>
	);
}

export function useFiles() {
	const context = useContext(FileContext);
	if (!context) {
		throw new Error("useFiles must be used within a FileProvider");
	}
	return context;
}
