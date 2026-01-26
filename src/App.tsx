import { writeFile } from "@tauri-apps/plugin-fs";
import { useState } from "preact/hooks";
import { HexViewer } from "./lib/components/hex-viewer";
import StatusBar from "./lib/components/status-bar";
import { Tabs } from "./lib/components/tabs";
import Titlebar from "./lib/components/titlebar";
import { FileProvider, useFiles } from "./lib/context/FileContext";

function AppContent() {
	const { tabs, activeTabId, setActiveTab, closeTab, getActiveTab } =
		useFiles();
	const activeTab = getActiveTab();

	const [hasChanged, setHasChanged] = useState(false);

	async function handleSaveRequest(data: Uint8Array) {
		if (activeTab) {
			await writeFile(activeTab.filePath, data);

			setHasChanged(false);
			console.log(`File "${activeTab.fileName}" saved successfully!`);
		}
	}

	return (
		<div className="root h-screen flex flex-col overflow-hidden bg-background text-foreground">
			<Titlebar />
			<Tabs
				tabs={tabs}
				activeTabId={activeTabId}
				onTabClick={setActiveTab}
				onTabClose={closeTab}
			/>
			<main className="flex-1 overflow-hidden">
				<HexViewer
					data={activeTab?.data || null}
					onHasChanged={setHasChanged}
					onSaveRequest={handleSaveRequest}
				/>
			</main>
			<StatusBar hasChanged={hasChanged} />
		</div>
	);
}

function App() {
	return (
		<FileProvider>
			<AppContent />
		</FileProvider>
	);
}

export default App;
