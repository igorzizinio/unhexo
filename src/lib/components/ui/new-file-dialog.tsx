import { Dialog, NumberField } from "@base-ui/react";
import { Button } from "@base-ui/react/button";
import { MinusIcon, MoveHorizontalIcon, PlusIcon } from "lucide-preact";
import { useId } from "preact/hooks";

const DIALOG_BUTTON_CLASS =
	"inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors";

interface NewFileDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateFile: (size: number) => void;
}

export const NewFileDialog = ({
	open,
	onOpenChange,
	onCreateFile,
}: NewFileDialogProps) => {
	const newFileSizeId = useId();

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();

		const form = event.currentTarget as HTMLFormElement;
		const data = new FormData(form);
		const size = Number(data.get("size"));

		if (!size || size <= 0) return;

		onCreateFile(size);
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />

				<Dialog.Popup
					className="
						fixed top-1/2 left-1/2
						w-96 max-w-[calc(100vw-2rem)]
						-translate-x-1/2 -translate-y-1/2
						rounded-lg
						bg-popover text-popover-foreground
						border border-border
						shadow-xl
						p-6
						outline-none
						transition-all
						data-[starting-style]:scale-95 data-[starting-style]:opacity-0
						data-[ending-style]:scale-95 data-[ending-style]:opacity-0
					"
				>
					<Dialog.Title className="text-lg font-semibold">
						New file
					</Dialog.Title>

					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Create a new file to get started.
					</Dialog.Description>

					<form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
						<NumberField.Root
							class="flex flex-col gap-2"
							min={1}
							name="size"
							defaultValue={2048}
						>
							<NumberField.ScrubArea className="cursor-ew-resize">
								<label htmlFor={newFileSizeId} className="text-sm font-medium">
									File Size (bytes)
								</label>
								<NumberField.ScrubAreaCursor className="drop-shadow-[0_1px_1px_#0008] filter">
									<MoveHorizontalIcon className="text-foreground" />
								</NumberField.ScrubAreaCursor>
							</NumberField.ScrubArea>

							<NumberField.Group className="flex">
								<NumberField.Decrement className="h-9 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-l-md hover:bg-accent hover:text-accent-foreground transition-colors">
									<MinusIcon />
								</NumberField.Decrement>
								<NumberField.Input
									id={newFileSizeId}
									className="h-9
									border border-border
									bg-background
									px-3 text-sm
									text-foreground
									focus:outline-none
									focus:ring-2 focus:ring-ring"
								/>
								<NumberField.Increment className="h-9 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-r-md hover:bg-accent hover:text-accent-foreground transition-colors">
									<PlusIcon />
								</NumberField.Increment>
							</NumberField.Group>
						</NumberField.Root>

						<div className="mt-6 flex justify-end gap-2">
							<Dialog.Close
								className={`${DIALOG_BUTTON_CLASS} border border-border bg-background hover:bg-accent hover:text-accent-foreground`}
							>
								Cancel
							</Dialog.Close>

							<Button
								type="submit"
								className={`${DIALOG_BUTTON_CLASS} bg-primary text-primary-foreground hover:bg-primary/90`}
							>
								Create
							</Button>
						</div>
					</form>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
