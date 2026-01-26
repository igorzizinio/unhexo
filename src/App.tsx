import { HexViewer } from "./lib/components/hex-viewer";
import { Tabs } from "./lib/components/tabs";
import Titlebar from "./lib/components/titlebar";
import { FileProvider, useFiles } from "./lib/context/FileContext";

function AppContent() {
	const { tabs, activeTabId, setActiveTab, closeTab, getActiveTab } =
		useFiles();
	const activeTab = getActiveTab();

	return (
		<div className="root h-screen flex flex-col overflow-hidden bg-background text-foreground">
			<Titlebar />
			<Tabs
				tabs={tabs}
				activeTabId={activeTabId}
				onTabClick={setActiveTab}
				onTabClose={closeTab}
			/>
			<main className="flex-1 overf	low-hidden">
				<HexViewer
					data={activeTab?.data || null}
					fileName={activeTab?.fileName}
				/>
			</main>
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
