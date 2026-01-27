import { useFiles } from "../../context/FileContext";

const StatusBar = ({ hasChanged }: { hasChanged: boolean }) => {
	const { tabs, activeTabId } = useFiles();

	const active = tabs.find((tab) => tab.id === activeTabId);

	return (
		<footer>
			<div className="h-6 px-4 flex items-center bg-accent/20 text-sm text-foreground/70 justify-between">
				<div>
					<span className="text-xs">
						<span>{active?.fileName}</span>
						<span>{hasChanged ? "*" : ""}</span>
					</span>
				</div>
				<div>
					<span className="text-xs">
						{active ? `${active.data.length} bytes` : "No file opened"}
					</span>
				</div>
			</div>
		</footer>
	);
};

export default StatusBar;
