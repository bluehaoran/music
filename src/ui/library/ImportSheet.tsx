import { useRef, useState } from "react";
import type { ChordProImport } from "../../data/chordpro";
import { importChordPro } from "../../data/chordpro";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

interface Props {
	open: boolean;
	onImport: (data: ChordProImport) => Promise<void>;
	onClose: () => void;
}

export function ImportSheet({ open, onImport, onClose }: Props) {
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const content = ev.target?.result;
			if (typeof content === "string") {
				setText(content);
				setError(null);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	}

	async function handleImport() {
		if (!text.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const data = importChordPro(text);
			await onImport(data);
		} catch {
			setError("Could not parse — check the ChordPro format and try again.");
			setLoading(false);
		}
	}

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
					<SheetTitle>Import ChordPro</SheetTitle>
				</SheetHeader>

				<p className="text-sm text-muted-foreground">
					Paste ChordPro text, or open a{" "}
					<code className="text-xs bg-muted px-1 py-0.5 rounded">.cho</code>{" "}
					file.
				</p>

				<Textarea
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setError(null);
					}}
					placeholder={
						"{title: My Song}\n{key: C major}\n\n{start_of_verse: Verse}\n[C]Hello [Am]world [F]these [G7]chords\n{end_of_verse}"
					}
					rows={8}
					spellCheck={false}
					className="font-mono text-sm resize-none"
				/>

				{error && <p className="text-sm text-destructive">{error}</p>}

				<input
					ref={fileRef}
					type="file"
					accept=".cho,.chopro,.txt"
					className="hidden"
					onChange={handleFile}
				/>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => fileRef.current?.click()}
						disabled={loading}
					>
						Open File
					</Button>
					<Button
						className="flex-1"
						onClick={handleImport}
						disabled={!text.trim() || loading}
					>
						{loading ? "Importing…" : "Import"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
