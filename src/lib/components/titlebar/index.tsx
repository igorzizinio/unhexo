import { Button } from "@base-ui/react/button";
import { Menu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { exit } from "@tauri-apps/plugin-process";
import {
  MaximizeIcon,
  MinusIcon,
  MoonIcon,
  SunIcon,
  XIcon,
} from "lucide-preact";
import { useFiles } from "../../context/FileContext";
import { useTheme } from "../../hooks/useTheme";

const Titlebar = () => {
  const appWindow = getCurrentWindow();
  const { theme, toggleTheme } = useTheme();
  const { openFile: addFile } = useFiles();

  const openFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "All Files",
          extensions: ["*"],
        },
      ],
    });

    if (selected) {
      try {
        const data = await readFile(selected);
        const fileName = selected.split(/[\\/]/).pop() || "Unknown";
        addFile(selected, fileName, new Uint8Array(data));
      } catch (error) {
        console.error("Failed to read file:", error);
      }
    }
  };

  const minimizeApp = async () => {
    await appWindow.minimize();
  };

  const maximizeApp = async () => {
    await appWindow.toggleMaximize();
  };

  const closeApp = async () => {
    await exit(0);
  };
  return (
    <div class="flex w-full items-center justify-between titlebar border-b border-border bg-background">
      <Menubar className="no-drag">
        <Menu.Root>
          <Menu.Trigger className="h-8 rounded px-3 text-sm select-none text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            File
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="outline-none" sideOffset={6}>
              <Menu.Popup className="origin-[var(--transform-origin)] rounded-md bg-popover text-popover-foreground py-1 shadow-lg border border-border data-[ending-style]:opacity-0 data-[ending-style]:transition-opacity data-[instant]:transition-none">
                <Menu.Item className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm mx-1">
                  New
                </Menu.Item>
                <Menu.Item
                  onClick={openFile}
                  className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm mx-1"
                >
                  Open
                </Menu.Item>
                <Menu.Item className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm mx-1">
                  Save
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </Menubar>

      {/* Actions (minimize, maximize, close) */}
      <div class="flex items-center gap-1 no-drag">
        <Button
          type="button"
          onClick={toggleTheme}
          class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded"
        >
          {theme === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
        </Button>

        <Button
          type="button"
          onClick={minimizeApp}
          class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded"
        >
          <MinusIcon size={16} />
        </Button>
        <Button
          onClick={maximizeApp}
          class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded"
        >
          <MaximizeIcon size={16} />
        </Button>
        <Button
          onClick={closeApp}
          class="h-8 w-8 flex items-center justify-center text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors rounded"
        >
          <XIcon size={16} />
        </Button>
      </div>
    </div>
  );
};

export default Titlebar;
