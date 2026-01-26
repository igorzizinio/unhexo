import { Button } from "@base-ui/react/button";
import { Menu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { exit } from "@tauri-apps/plugin-process";
import { MaximizeIcon, MinusIcon, XIcon } from "lucide-preact";

const Titlebar = () => {
  const appWindow = getCurrentWindow();

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
    <div class="flex w-full items-center justify-between titlebar">
      <Menubar className="no-drag">
        <Menu.Root>
          <Menu.Trigger className="h-8 rounded px-3 text-sm font-medium text-gray-600 outline-none select-none focus-visible:bg-gray-100 data-[disabled]:opacity-50 data-[popup-open]:bg-gray-100">
            File
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="outline-none" sideOffset={6}>
              <Menu.Popup className="origin-[var(--transform-origin)] rounded-md bg-[canvas] py-1 text-gray-900 shadow-lg shadow-gray-200 outline outline-1 outline-gray-200 data-[ending-style]:opacity-0 data-[ending-style]:transition-opacity data-[instant]:transition-none dark:shadow-none dark:outline dark:outline-1 dark:-outline-offset-1 dark:outline-gray-300">
                <Menu.Item className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900">
                  New
                </Menu.Item>
                <Menu.Item
                  onClick={openFile}
                  className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900"
                >
                  Open
                </Menu.Item>
                <Menu.Item className="flex cursor-default items-center justify-between gap-4 px-4 py-2 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-gray-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-gray-900">
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
          onClick={minimizeApp}
          class="h-8 w-8 flex items-center justify-center hover:bg-gray-200 transition-colors rounded"
        >
          <MinusIcon size={16} />
        </Button>
        <Button
          onClick={maximizeApp}
          class="h-8 w-8 flex items-center justify-center hover:bg-gray-200 transition-colors rounded"
        >
          <MaximizeIcon size={16} />
        </Button>
        <Button
          onClick={closeApp}
          class="h-8 w-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors rounded"
        >
          <XIcon size={16} />
        </Button>
      </div>
    </div>
  );
};

export default Titlebar;
