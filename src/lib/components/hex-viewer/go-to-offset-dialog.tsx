import { Button, Dialog, Field } from "@base-ui/react";

interface GoToOffsetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onGoToOffset: (offset: number) => void;
	maxOffset: number;
}

function parseOffsetInput(rawInput: string): number | null {
	let input = rawInput.trim();
	if (!input) return null;

	let base = 10;

	if (input.startsWith("0x") || input.startsWith("0X")) {
		input = input.slice(2);
		base = 16;
	} else if (input.startsWith("#")) {
		input = input.slice(1);
		base = 16;
	} else if (/^[0-9a-fA-F]+$/.test(input) && /[a-fA-F]/.test(input)) {
		base = 16;
	}

	const parsed = Number.parseInt(input, base);
	return Number.isNaN(parsed) ? null : parsed;
}

export default function GoToOffsetDialog({
	open,
	onOpenChange,
	onGoToOffset,
	maxOffset,
}: Readonly<GoToOffsetDialogProps>) {
	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();

		const form = event.currentTarget as HTMLFormElement;
		const data = new FormData(form);
		const rawInput = data.get("gotoInput")?.toString() ?? "";
		const parsedOffset = parseOffsetInput(rawInput);

		if (parsedOffset !== null) {
			const clamped = Math.max(0, Math.min(maxOffset, parsedOffset));
			onGoToOffset(clamped);
		}

		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
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
      			  data-starting-style:scale-95 data-starting-style:opacity-0
      			  data-ending-style:scale-95 data-ending-style:opacity-0
      			"
				>
					<Dialog.Title className="text-lg font-semibold">Go to</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Go to desired hex position
					</Dialog.Description>

					<form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
						<Field.Root className="flex flex-col gap-2" name="gotoInput">
							<label className="text-sm font-medium" htmlFor="gotoInput">
								Position
							</label>
							<Field.Control
								id="gotoInput"
								placeholder="0x000000"
								className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</Field.Root>

						<div className="mt-6 flex justify-end gap-2">
							<Dialog.Close className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors border border-border bg-background hover:bg-accent hover:text-accent-foreground">
								Cancel
							</Dialog.Close>

							<Button
								type="submit"
								className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
							>
								Go
							</Button>
						</div>
					</form>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
