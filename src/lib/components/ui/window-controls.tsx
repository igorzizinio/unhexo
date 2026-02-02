import { Button } from "@base-ui/react/button";
import {
	MaximizeIcon,
	MinusIcon,
	MoonIcon,
	SunIcon,
	XIcon,
} from "lucide-preact";

const BUTTON_ICON_CLASS =
	"h-8 w-8 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded";

interface WindowControlsProps {
	theme: "light" | "dark";
	onToggleTheme: () => void;
	onMinimize: () => Promise<void>;
	onMaximize: () => Promise<void>;
	onClose: () => Promise<void>;
}

export const WindowControls = ({
	theme,
	onToggleTheme,
	onMinimize,
	onMaximize,
	onClose,
}: WindowControlsProps) => (
	<div class="flex items-center gap-1 no-drag">
		<Button type="button" onClick={onToggleTheme} class={BUTTON_ICON_CLASS}>
			{theme === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
		</Button>

		<Button type="button" onClick={onMinimize} class={BUTTON_ICON_CLASS}>
			<MinusIcon size={16} />
		</Button>
		<Button onClick={onMaximize} class={BUTTON_ICON_CLASS}>
			<MaximizeIcon size={16} />
		</Button>
		<Button
			onClick={onClose}
			class={`${BUTTON_ICON_CLASS} hover:bg-destructive hover:text-destructive-foreground rounded-tr-none`}
		>
			<XIcon size={16} />
		</Button>
	</div>
);
