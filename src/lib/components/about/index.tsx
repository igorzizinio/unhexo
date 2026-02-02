import { Dialog, Separator } from "@base-ui/react";
import { getVersion } from "@tauri-apps/api/app";
import { ExternalLinkIcon } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";

const DIALOG_BUTTON_CLASS =
	"inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors";

const LICENSE = `Unhexo — Hex Editor
© 2026 Igor S. Zizinio

Licensed under the GNU General Public License version 3 (GPL-3.0-only).
This software comes with NO WARRANTY.

Source code:
https://codeberg.org/igorzizinio/unhexo
`;

interface AboutProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const About = ({ open, onOpenChange }: AboutProps) => {
	const [version, setVersion] = useState<string>("");
	useEffect(() => {
		getVersion().then((ver) => setVersion(ver));
	}, []);

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
						About Unhexo
					</Dialog.Title>

					<Dialog.Description className="mt-4 text-sm text-muted-foreground space-y-4">
						<p className="text-foreground">
							A modern hex viewer and editor built with{" "}
							<span className="font-semibold">Tauri</span>.
							<p className="text-xs text-muted-foreground">Version {version}</p>
						</p>

						<Separator className="my-4 h-px w-full bg-border" />

						<div className="space-y-2">
							<p className="font-semibold text-foreground text-xs uppercase tracking-wide">
								License & Credits
							</p>
							<pre className="p-3 bg-accent/50 rounded text-xs whitespace-pre-wrap font-mono leading-relaxed border border-border/50">
								{LICENSE}
							</pre>
						</div>
					</Dialog.Description>

					<div className="mt-6 flex justify-between items-center gap-3">
						<a
							href="https://codeberg.org/igorzizinio/unhexo"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
						>
							<ExternalLinkIcon size={16} />
							Code
						</a>
						<Dialog.Close
							className={`${DIALOG_BUTTON_CLASS} border border-border bg-background hover:bg-accent hover:text-accent-foreground`}
						>
							Close
						</Dialog.Close>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default About;
