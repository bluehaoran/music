import { useState } from "react";
import { chordLabel } from "../../theory/chords";
import type { Chord } from "../../theory/chords";
import type { Bar, Song } from "../../theory/model";
import { buildDiatonicGrid } from "../../theory/nashville";
import { createBar } from "../../theory/songFactory";
import { replaceBar, removeBar } from "../../data/songRepo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

interface Props {
	bar: Bar;
	song: Song;
	sectionId: string;
	partId: string;
	onClose: () => void;
}

export function BarEditSheet({ bar, song, sectionId, partId, onClose }: Props) {
	const [chords, setChords] = useState<Chord[]>(() =>
		bar.slots.map((s) => s.chord),
	);
	const [lyric, setLyric] = useState(bar.lyric ?? "");

	const grid = buildDiatonicGrid(song.key, song.mode);

	function addChord(chord: Chord) {
		setChords((prev) => [...prev, chord]);
	}

	function removeChord(idx: number) {
		setChords((prev) => prev.filter((_, i) => i !== idx));
	}

	async function handleSave() {
		if (chords.length === 0) return;
		const updated = {
			...createBar(chords, song.timeSignature),
			id: bar.id,
			lyric: lyric.trim() || undefined,
		};
		await replaceBar(song.id, sectionId, partId, updated);
		onClose();
	}

	async function handleDelete() {
		if (!window.confirm("Delete this bar?")) return;
		await removeBar(song.id, sectionId, partId, bar.id);
		onClose();
	}

	return (
		<Sheet
			open={true}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<SheetContent
				side="bottom"
				className="max-h-[85dvh] overflow-y-auto flex flex-col gap-4"
			>
				<SheetHeader>
					<SheetTitle>Edit bar</SheetTitle>
				</SheetHeader>

				{/* Current chords */}
				<div className="flex flex-wrap gap-2 min-h-[40px]">
					{chords.length === 0 ? (
						<span className="text-sm text-muted-foreground">
							Tap below to add chords
						</span>
					) : (
						chords.map((chord, i) => (
							<button
								key={i}
								className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted text-sm font-medium"
								onClick={() => removeChord(i)}
								title="Tap to remove"
							>
								{chordLabel(chord)}
								<span className="text-muted-foreground text-xs">×</span>
							</button>
						))
					)}
				</div>

				{/* Chord grid */}
				<div className="grid grid-cols-4 gap-2">
					{grid.map((btn) => (
						<button
							key={btn.numeral}
							className="flex flex-col items-center py-2.5 rounded-lg border border-border bg-muted/40 active:bg-primary/20"
							onClick={() => addChord(btn.chord)}
						>
							<span className="text-sm font-bold">{btn.numeralLabel}</span>
							<span className="text-xs text-muted-foreground">
								{btn.chordName}
							</span>
						</button>
					))}
				</div>

				{/* Lyric */}
				<Input
					value={lyric}
					onChange={(e) => setLyric(e.target.value)}
					placeholder="Lyric for this bar…"
					spellCheck
				/>

				{/* Actions */}
				<div className="flex gap-2">
					<Button variant="destructive" onClick={handleDelete}>
						Delete bar
					</Button>
					<Button
						className="flex-1"
						onClick={handleSave}
						disabled={chords.length === 0}
					>
						Save
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
