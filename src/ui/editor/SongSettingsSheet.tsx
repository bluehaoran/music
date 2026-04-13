import { useEffect, useState } from "react";
import type { DrumPattern, Song, TimeSignature } from "../../theory/model";
import { updateSong } from "../../data/songRepo";
import { getAllCustomPatterns } from "../../data/drumPatternRepo";
import { patternsForTimeSig, setCustomPatterns } from "../../audio/drums";
import { DrumPatternEditor } from "./DrumPatternEditor";
import { Button } from "@/components/ui/button";
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
	onExport: () => void;
}

const TIME_SIGS: TimeSignature[] = [
	{ numerator: 4, denominator: 4 },
	{ numerator: 3, denominator: 4 },
	{ numerator: 6, denominator: 8 },
	{ numerator: 2, denominator: 4 },
];

function tsLabel(ts: TimeSignature) {
	return `${ts.numerator}/${ts.denominator}`;
}

function tsEqual(a: TimeSignature, b: TimeSignature) {
	return a.numerator === b.numerator && a.denominator === b.denominator;
}

export function SongSettingsSheet({ song, open, onClose, onExport }: Props) {
	const [instrument, setInstrument] = useState(song.instrument);
	const [capo, setCapo] = useState(song.capo);
	const [bpm, setBpm] = useState(song.bpm);
	const [timeSig, setTimeSig] = useState<TimeSignature>(song.timeSignature);
	const [drumPatternId, setDrumPatternId] = useState(song.drumPatternId);
	const [customPatterns, setCustomPatternsState] = useState<DrumPattern[]>([]);

	// Editor state
	const [editorOpen, setEditorOpen] = useState(false);
	const [editingPattern, setEditingPattern] = useState<DrumPattern | undefined>();

	// Load custom patterns when the sheet opens
	useEffect(() => {
		if (!open) return;
		getAllCustomPatterns().then((patterns) => {
			setCustomPatternsState(patterns);
			setCustomPatterns(patterns); // sync into audio registry
		});
	}, [open]);

	const drumPatterns = patternsForTimeSig(timeSig);

	function handleTimeSig(ts: TimeSignature) {
		setTimeSig(ts);
		const compatible = patternsForTimeSig(ts);
		if (drumPatternId && !compatible.find((p) => p.id === drumPatternId)) {
			setDrumPatternId(null);
		}
	}

	async function handleDone() {
		await updateSong(song.id, {
			instrument,
			capo: instrument === "guitar" ? capo : 0,
			bpm,
			timeSignature: timeSig,
			drumPatternId,
		});
		onClose();
	}

	function openNewEditor() {
		setEditingPattern(undefined);
		setEditorOpen(true);
	}

	function openEditEditor(pattern: DrumPattern) {
		setEditingPattern(pattern);
		setEditorOpen(true);
	}

	async function handlePatternSaved(saved: DrumPattern) {
		setEditorOpen(false);
		// Refresh custom patterns
		const updated = await getAllCustomPatterns();
		setCustomPatternsState(updated);
		setCustomPatterns(updated);
		// Auto-select the saved pattern if it matches the current time sig
		if (
			saved.timeSignature.numerator === timeSig.numerator &&
			saved.timeSignature.denominator === timeSig.denominator
		) {
			setDrumPatternId(saved.id);
		}
	}

	async function handlePatternDeleted(id: string) {
		setEditorOpen(false);
		const updated = await getAllCustomPatterns();
		setCustomPatternsState(updated);
		setCustomPatterns(updated);
		if (drumPatternId === id) setDrumPatternId(null);
	}

	return (
		<>
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
						<SheetTitle>Song Settings</SheetTitle>
					</SheetHeader>

					{/* Instrument */}
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Instrument</span>
						<div className="flex rounded-lg border border-border overflow-hidden">
							{(["guitar", "piano", "synth"] as const).map((inst) => (
								<button
									key={inst}
									className={[
										"px-4 py-1.5 text-sm capitalize",
										instrument === inst
											? "bg-primary text-primary-foreground"
											: "bg-muted/40 text-foreground",
									].join(" ")}
									onClick={() => setInstrument(inst)}
								>
									{inst}
								</button>
							))}
						</div>
					</div>

					{/* Capo */}
					{instrument === "guitar" && (
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Capo</span>
							<div className="flex items-center gap-3">
								<Button
									variant="outline"
									size="icon"
									className="size-8"
									onClick={() => setCapo((c) => Math.max(0, c - 1))}
									disabled={capo === 0}
								>
									−
								</Button>
								<span className="text-sm w-16 text-center">
									{capo === 0 ? "None" : `Fret ${capo}`}
								</span>
								<Button
									variant="outline"
									size="icon"
									className="size-8"
									onClick={() => setCapo((c) => Math.min(7, c + 1))}
									disabled={capo === 7}
								>
									+
								</Button>
							</div>
						</div>
					)}

					{/* BPM */}
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Tempo</span>
						<div className="flex items-center gap-3">
							<Button
								variant="outline"
								size="icon"
								className="size-8"
								onClick={() => setBpm((b) => Math.max(40, b - 5))}
								disabled={bpm <= 40}
							>
								−
							</Button>
							<span className="text-sm w-16 text-center">{bpm} BPM</span>
							<Button
								variant="outline"
								size="icon"
								className="size-8"
								onClick={() => setBpm((b) => Math.min(240, b + 5))}
								disabled={bpm >= 240}
							>
								+
							</Button>
						</div>
					</div>

					{/* Time signature */}
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm font-medium">Time</span>
						<div className="flex gap-1.5 flex-wrap justify-end">
							{TIME_SIGS.map((ts) => (
								<button
									key={tsLabel(ts)}
									className={[
										"px-3 py-1 rounded-lg border text-sm",
										tsEqual(ts, timeSig)
											? "border-primary bg-primary text-primary-foreground"
											: "border-border bg-muted/40 text-foreground",
									].join(" ")}
									onClick={() => handleTimeSig(ts)}
								>
									{tsLabel(ts)}
								</button>
							))}
						</div>
					</div>

					{/* Drums */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Drums</span>
							<button
								className="px-2 py-0.5 rounded border border-border bg-muted/40 text-sm text-muted-foreground hover:bg-muted"
								onClick={openNewEditor}
							>
								+ New
							</button>
						</div>
						<div className="flex gap-1.5 flex-wrap">
							<button
								className={[
									"px-3 py-1 rounded-lg border text-sm",
									drumPatternId === null
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-muted/40 text-foreground",
								].join(" ")}
								onClick={() => setDrumPatternId(null)}
							>
								Off
							</button>
							{drumPatterns.map((p) => {
								const isCustom = customPatterns.some((c) => c.id === p.id);
								return (
									<div key={p.id} className="flex items-stretch">
										<button
											className={[
												"px-3 py-1 border text-sm",
												isCustom ? "rounded-l-lg border-r-0" : "rounded-lg",
												drumPatternId === p.id
													? "border-primary bg-primary text-primary-foreground"
													: "border-border bg-muted/40 text-foreground",
											].join(" ")}
											onClick={() => setDrumPatternId(p.id)}
										>
											{p.name}
										</button>
										{isCustom && (
											<button
												className={[
													"px-2 py-1 rounded-r-lg border text-xs",
													drumPatternId === p.id
														? "border-primary bg-primary/80 text-primary-foreground"
														: "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
												].join(" ")}
												onClick={() => openEditEditor(p)}
												title="Edit pattern"
											>
												✎
											</button>
										)}
									</div>
								);
							})}
						</div>
					</div>

					<Button variant="outline" onClick={onExport}>
						Export ChordPro
					</Button>

					<Button onClick={handleDone}>Done</Button>
				</SheetContent>
			</Sheet>

			<DrumPatternEditor
				open={editorOpen}
				pattern={editingPattern}
				defaultTimeSig={timeSig}
				onClose={() => setEditorOpen(false)}
				onSaved={handlePatternSaved}
				onDeleted={handlePatternDeleted}
			/>
		</>
	);
}
