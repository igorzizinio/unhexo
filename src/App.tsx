import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { MosaicNode } from "react-mosaic-component";
import { Mosaic } from "react-mosaic-component";
import { HexViewer } from "./lib/components/hex-viewer";
import StatusBar from "./lib/components/status-bar";
import { Tabs } from "./lib/components/tabs";
import Titlebar from "./lib/components/titlebar";
import { FileProvider, useFiles } from "./lib/context/FileContext";
import { diffBuffers } from "./lib/utils/diffBuffers";
import type { EditorWindow, ViewMode } from "./types";

//! DO NO REMOVE: this is necessary for the mosaic works
import "react-mosaic-component/react-mosaic-component.css";
import { getCurrentWebview } from "@tauri-apps/api/webview";

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

	const [viewMode, setViewMode] = useState<ViewMode>("tabs");
	const [windows, setWindows] = useState<Record<string, EditorWindow>>({});
	const [mosaicValue, setMosaicValue] = useState<
		MosaicNode<string> | string | null
	>(null);

	const [zoomLevel, setZoomLevel] = useState(1);

	// =========================
	// Comparação (somente 2 abas)
	// =========================

	const leftTab = tabs[0] ?? null;
	const rightTab = tabs[1] ?? null;

	const diffSet = useMemo(() => {
		if (!leftTab || !rightTab) return null;
		return diffBuffers(
			leftTab.buffer ?? new Uint8Array(0),
			rightTab.buffer ?? new Uint8Array(0),
		);
	}, [leftTab?.buffer, rightTab?.buffer]);

	// =========================
	// Mosaic / Layout
	// =========================

	useEffect(() => {
		if (viewMode === "tabs") {
			if (!activeTabId) {
				setWindows({});
				setMosaicValue(null);
				return;
			}

			const panelId = `panel-${activeTabId}`;
			setWindows({
				[panelId]: { id: panelId, activeTabId },
			});
			setMosaicValue(panelId);
		}

		if (viewMode === "mosaic") {
			const newWindows: Record<string, EditorWindow> = {};
			const panels = tabs.map((t) => {
				const id = `panel-${t.id}`;
				newWindows[id] = { id, activeTabId: t.id };
				return id;
			});

			setWindows(newWindows);

			if (panels.length === 0) {
				setMosaicValue(null);
			} else if (panels.length === 1) {
				setMosaicValue(panels[0]);
			} else {
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

	// =========================
	// Save
	// =========================

	async function handleSaveRequest(data: Uint8Array) {
		if (!activeTab) return;
		await saveTab(activeTab.id, data);
	}

	useEffect(() => {
		getCurrentWebview().setZoom(zoomLevel);
	}, [zoomLevel]);

	// =========================
	// Global keys
	// =========================

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "+":
					case "=": {
						e.preventDefault();
						setZoomLevel((prev) => Math.min(prev + 0.1, 3));
						break;
					}
					case "-": {
						e.preventDefault();
						setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
						break;
					}

					case "tab": {
						e.preventDefault();
						if (!tabs.length) return;

						const idx = tabs.findIndex((t) => t.id === activeTabId);
						const next = (idx + 1) % tabs.length;
						setActiveTab(tabs[next].id);
						break;
					}

					case "s": {
						e.preventDefault();
						if (!activeTab) return;
						handleSaveRequest(activeTab.buffer ?? new Uint8Array(0));
						break;
					}
				}
			}
		};

		globalThis.addEventListener("keydown", handleKeyDown);
		return () => globalThis.removeEventListener("keydown", handleKeyDown);
	}, [tabs, activeTabId, activeTab]);

	// =========================
	// Render
	// =========================

	return (
		<div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
			<Titlebar
				viewMode={viewMode}
				setViewMode={setViewMode}
				onSaveRequest={() =>
					saveTab(activeTabId ?? "", activeTab?.buffer ?? new Uint8Array(0))
				}
			/>

			<Tabs
				tabs={tabs}
				activeTabId={activeTabId}
				onTabClick={setActiveTab}
				onTabClose={closeTab}
			/>

			<main
				className={`flex-1 overflow-hidden ${viewMode === "tabs" ? "p-1.5" : ""}`}
			>
				{viewMode === "tabs" && activeTab && (
					<HexViewer
						tabId={activeTab.id}
						buffer={activeTab.buffer ?? new Uint8Array(0)}
						diffSet={null}
						isActive
						onActivate={() => setActiveTab(activeTab.id)}
						onHasChanged={(c) => markAsChanged(activeTab.id, c)}
					/>
				)}

				{viewMode === "mosaic" && mosaicValue && (
					<Mosaic
						value={mosaicValue}
						onChange={setMosaicValue}
						className="bg-background"
						renderTile={(id) => {
							const win = windows[id];
							if (!win) return null;

							const tab = tabs.find((t) => t.id === win.activeTabId) ?? null;

							const isComparable =
								tabs.length === 2 &&
								tab &&
								leftTab &&
								rightTab &&
								(tab.id === leftTab.id || tab.id === rightTab.id);

							return (
								<HexViewer
									tabId={tab?.id || ""}
									buffer={tab?.buffer ?? new Uint8Array(0)}
									diffSet={isComparable ? diffSet : null}
									isActive={tab?.id === activeTabId}
									onActivate={() => tab && setActiveTab(tab.id)}
									onHasChanged={(c) => {
										if (tab) markAsChanged(tab.id, c);
									}}
								/>
							);
						}}
					/>
				)}
			</main>

			<StatusBar viewMode={viewMode} />
		</div>
	);
}

export default function App() {
	return (
		<FileProvider>
			<AppContent />
		</FileProvider>
	);
}
