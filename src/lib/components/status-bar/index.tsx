import { useFiles } from "../../context/FileContext";

interface StatusBarProps {
	viewMode: string;
}

const StatusBar = ({ viewMode }: StatusBarProps) => {
	const { tabs, activeTabId } = useFiles();

	const active = tabs.find((tab) => tab.id === activeTabId);

	return (
		<footer>
			<div className="h-6 px-4 text-xs flex items-center bg-accent text-foreground/70 justify-between">
				<div className="flex gap-4 h-full items-center select-none">
					<span className="flex items-center hover:bg-accent-foreground/20 h-full px-2 cursor-default">
						{active?.fileName}
						{active?.hasChanged ? "*" : ""}
					</span>
				</div>
				<div className="flex gap-4 h-full items-center select-none">
					<span className="flex items-center hover:bg-accent-foreground/20 h-full px-2 cursor-default">
						View Mode: {viewMode}
					</span>
					<span className="flex items-center hover:bg-accent-foreground/20 h-full px-2 cursor-default">
						{active ? `${active.data.length} bytes` : "No file opened"}
					</span>
				</div>
			</div>
		</footer>
	);
};

export default StatusBar;
