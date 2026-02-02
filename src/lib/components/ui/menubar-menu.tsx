import { Menu } from "@base-ui/react/menu";
import { ChevronRightIcon } from "lucide-preact";
import type { ComponentChildren } from "preact";

const MENU_ITEM_CLASS =
	"flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors duration-150 rounded-sm mx-1";
const MENU_POPUP_CLASS =
	"origin-[var(--transform-origin)] rounded-md bg-popover text-popover-foreground py-1 shadow-lg border border-border data-[ending-style]:opacity-0 data-[ending-style]:transition-opacity data-[instant]:transition-none transition-all duration-200 ease-out";
const MENU_TRIGGER_CLASS =
	"h-8 rounded px-3 text-sm select-none text-foreground hover:bg-accent hover:text-accent-foreground data-[open]:bg-accent data-[open]:text-accent-foreground transition-colors duration-150";

interface MenubarMenuProps {
	label: string;
	children: ComponentChildren;
}

export const MenubarMenu = ({ label, children }: MenubarMenuProps) => (
	<Menu.Root>
		<Menu.Trigger className={MENU_TRIGGER_CLASS}>{label}</Menu.Trigger>
		<Menu.Portal>
			<Menu.Positioner className="outline-none" sideOffset={6}>
				<Menu.Popup
					className={MENU_POPUP_CLASS}
					style={{
						transitionProperty: "opacity, transform",
					}}
				>
					{children}
				</Menu.Popup>
			</Menu.Positioner>
		</Menu.Portal>
	</Menu.Root>
);

interface MenubarItemProps {
	children: ComponentChildren;
	onClick?: () => void;
}

export const MenubarItem = ({ children, onClick }: MenubarItemProps) => (
	<Menu.Item onClick={onClick} className={MENU_ITEM_CLASS}>
		{children}
	</Menu.Item>
);

interface MenubarSubmenuProps {
	label: string;
	children: ComponentChildren;
}

export const MenubarSubmenu = ({ label, children }: MenubarSubmenuProps) => (
	<Menu.SubmenuRoot>
		<Menu.SubmenuTrigger className={MENU_ITEM_CLASS}>
			{label}
			<ChevronRightIcon size={14} />
		</Menu.SubmenuTrigger>

		<Menu.Portal>
			<Menu.Positioner className="outline-none">
				<Menu.Popup
					className="ml-2.5 rounded-md bg-popover text-popover-foreground py-1 shadow-lg border border-border data-starting-style:opacity-0 data-[ending-style]:opacity-0 transition-all duration-200 ease-out"
					style={{
						transitionProperty: "opacity, transform",
					}}
				>
					{children}
				</Menu.Popup>
			</Menu.Positioner>
		</Menu.Portal>
	</Menu.SubmenuRoot>
);
