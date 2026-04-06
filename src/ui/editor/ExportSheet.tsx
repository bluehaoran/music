import { useState } from "react";
import type { Song } from "../../theory/model";
import { exportChordPro } from "../../data/chordpro";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

interface Props {
	song: Song;
	open: boolean;
	onClose: () => void;
}

export function ExportSheet({ song, open, onClose }: Props) {
	const text = exportChordPro(song);
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore
		}
	}

	function handleDownload() {
		const blob = new Blob([text], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${song.title}.cho`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleShare() {
		try {
			await navigator.share({ title: song.title, text });
		} catch {
			// user cancelled or API unavailable
		}
	}

	const canShare = typeof navigator !== "undefined" && "share" in navigator;

	return (
		<Sheet
			open={open}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<SheetContent
				side="bottom"
				className="max-h-[85dvh] overflow-y-auto flex flex-col gap-4"
			>
				<SheetHeader>
					<SheetTitle>Export ChordPro</SheetTitle>
				</SheetHeader>

				<p className="text-sm text-muted-foreground font-mono">
					{song.title}.cho
				</p>

				<Textarea
					value={text}
					readOnly
					spellCheck={false}
					rows={10}
					className="font-mono text-sm resize-none"
				/>

				<div className="flex gap-2">
					<Button variant="outline" onClick={handleDownload}>
						Download
					</Button>
					{canShare && (
						<Button variant="outline" onClick={handleShare}>
							Share
						</Button>
					)}
					<Button className="flex-1" onClick={handleCopy}>
						{copied ? "Copied!" : "Copy"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
