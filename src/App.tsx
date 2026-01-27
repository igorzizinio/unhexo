import { useEffect, useState } from "preact/hooks";
import { Mosaic, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import { HexViewer } from "./lib/components/hex-viewer";
import StatusBar from "./lib/components/status-bar";
import { Tabs } from "./lib/components/tabs";
import Titlebar from "./lib/components/titlebar";
import { FileProvider, useFiles } from "./lib/context/FileContext";

interface EditorWindow {
	id: string;
	activeTabId: string | null;
}

export type ViewMode = "tabs" | "mosaic";

function AppContent() {
	const {
		tabs,
		activeTabId,
		setActiveTab,
		closeTab,
		activeTab,
		saveTab,
		markAsChanged,
	} = useFiles();

	const [viewMode, setViewMode] = useState<ViewMode>("tabs"); // default: tabs
	const [windows, setWindows] = useState<Record<string, EditorWindow>>({});
	const [mosaicValue, setMosaicValue] = useState<
		MosaicNode<string> | string | null
	>(null);

	// Atualiza Mosaic automaticamente quando o viewMode ou as abas mudam
	useEffect(() => {
		if (viewMode === "tabs") {
			// Só mostra o painel ativo
			const firstPanelId = activeTabId ? `panel-${activeTabId}` : null;
			if (firstPanelId) {
				setWindows({
					[firstPanelId]: { id: firstPanelId, activeTabId: activeTabId },
				});
				setMosaicValue(firstPanelId);
			} else {
				setWindows({});
				setMosaicValue(null);
			}
		} else if (viewMode === "mosaic") {
			// Cria um painel para cada aba aberta
			const newWindows: Record<string, EditorWindow> = {};
			const panels = tabs.map((t) => {
				const panelId = `panel-${t.id}`;
				newWindows[panelId] = { id: panelId, activeTabId: t.id };
				return panelId;
			});
			setWindows(newWindows);

			// Cria árvore simples horizontal com todos os painéis
			if (panels.length === 0) {
				setMosaicValue(null);
			} else if (panels.length === 1) {
				setMosaicValue(panels[0]);
			} else {
				// Cria split em árvore horizontal
				let node: MosaicNode<string> = {
					direction: "row",
					first: panels[0],
					second: panels[1],
					splitPercentage: 50,
				};
				for (let i = 2; i < panels.length; i++) {
					node = {
						direction: "row",
						first: node,
						second: panels[i],
						splitPercentage: 50,
					};
				}
				setMosaicValue(node);
			}
		}
	}, [viewMode, tabs, activeTabId]);

	// Salvar arquivo
	async function handleSaveRequest(data: Uint8Array) {
		if (activeTab) {
			await saveTab(activeTab.id, data);
			console.log(`File "${activeTab.fileName}" saved successfully!`);
		}
	}

	return (
		<div className="root h-screen flex flex-col overflow-hidden bg-background text-foreground">
			<Titlebar viewMode={viewMode} setViewMode={setViewMode} />
			<Tabs
				tabs={tabs}
				activeTabId={activeTabId}
				onTabClick={setActiveTab}
				onTabClose={closeTab}
			/>

			<main className="flex-1 overflow-hidden">
				{viewMode === "tabs" && activeTab && (
					<HexViewer
						data={activeTab.data}
						onHasChanged={(hasChanged) =>
							markAsChanged(activeTab.id, hasChanged)
						}
						onSaveRequest={handleSaveRequest}
					/>
				)}

				{viewMode === "mosaic" && mosaicValue && (
					<Mosaic
						value={mosaicValue}
						onChange={setMosaicValue}
						className="bg-background"
						renderTile={(id) => {
							const window = windows[id];
							if (!window) return null;
							const tab = tabs.find((t) => t.id === window.activeTabId) || null;

							return (
								<HexViewer
									data={tab?.data || null}
									onHasChanged={(hasChanged) => {
										if (tab) markAsChanged(tab.id, hasChanged);
									}}
									onSaveRequest={handleSaveRequest}
								/>
							);
						}}
					/>
				)}
			</main>

			<StatusBar hasChanged={activeTab?.hasChanged || false} />
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
