export interface EditorWindow {
	id: string;
	activeTabId: string | null;
}

export type ViewMode = "tabs" | "mosaic";