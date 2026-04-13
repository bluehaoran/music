/**
 * DrumPatternEditor.tsx
 * Step-sequencer sheet for creating and editing custom drum patterns.
 */
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import type { DrumPattern, DrumSound, DrumStep, TimeSignature } from "../../theory/model";
import { ticksPerBar } from "../../theory/model";
import { drumEngine } from "../../audio/drums";
import { saveCustomPattern, deleteCustomPattern } from "../../data/drumPatternRepo";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
	open: boolean;
	/** Pattern to edit; undefined = create new */
	pattern?: DrumPattern;
	/** Default time sig for new patterns */
	defaultTimeSig: TimeSignature;
	onClose: () => void;
	onSaved: (pattern: DrumPattern) => void;
	onDeleted?: (id: string) => void;
}

const DRUM_ROWS: { sound: DrumSound; label: string }[] = [
	{ sound: "bd", label: "Bass" },
	{ sound: "sn", label: "Snare" },
	{ sound: "rs", label: "Rimshot" },
	{ sound: "hh", label: "Hi-Hat" },
	{ sound: "oh", label: "Open HH" },
	{ sound: "rd", label: "Ride" },
	{ sound: "tm", label: "Tom" },
];

const TIME_SIGS: TimeSignature[] = [
	{ numerator: 4, denominator: 4 },
	{ numerator: 2, denominator: 4 },
	{ numerator: 6, denominator: 8 },
];

function tsLabel(ts: TimeSignature) {
	return `${ts.numerator}/${ts.denominator}`;
}

function tsEqual(a: TimeSignature, b: TimeSignature) {
	return a.numerator === b.numerator && a.denominator === b.denominator;
}

/** Number of 16th-note steps for a given time signature. */
function stepCount(ts: TimeSignature): number {
	return ticksPerBar(ts);
}

/**
 * Visual beat group size (steps per group) — used for background shading.
 * 4/4 and 2/4: groups of 4 (quarter note = 4 sixteenth notes).
 * 6/8: groups of 6 (dotted quarter = 3 eighth notes = 6 sixteenth notes).
 */
function beatGroupSize(ts: TimeSignature): number {
	if (ts.denominator === 8) return 6; // compound time: dotted-quarter beat
	return 4; // simple time: quarter-note beat
}

/** Build an empty track (all nulls) of the right length for a time sig. */
function emptyTrack(ts: TimeSignature): DrumStep[] {
	return Array(stepCount(ts)).fill(null);
}

/** Build empty tracks for all drum sounds. */
function emptyTracks(ts: TimeSignature): Record<DrumSound, DrumStep[]> {
	return {
		bd: emptyTrack(ts),
		sn: emptyTrack(ts),
		hh: emptyTrack(ts),
		oh: emptyTrack(ts),
		rs: emptyTrack(ts),
		rd: emptyTrack(ts),
		tm: emptyTrack(ts),
	};
}

/** Flatten a DrumTrack (which may have nested arrays) to a flat DrumStep[]. */
function flattenTrack(track: (DrumStep | DrumStep[])[], ts: TimeSignature): DrumStep[] {
	const flat: DrumStep[] = emptyTrack(ts);
	const n = stepCount(ts);
	for (let i = 0; i < Math.min(track.length, n); i++) {
		const cell = track[i];
		if (Array.isArray(cell)) {
			// Spread subdivided steps starting at position i
			// Each inner array element maps to one 16th-note step
			for (let j = 0; j < cell.length && i + j < n; j++) {
				flat[i + j] = cell[j];
			}
		} else {
			flat[i] = cell;
		}
	}
	return flat;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DrumPatternEditor({
	open,
	pattern,
	defaultTimeSig,
	onClose,
	onSaved,
	onDeleted,
}: Props) {
	const isNew = !pattern;
	const [name, setName] = useState("");
	const [timeSig, setTimeSig] = useState<TimeSignature>(defaultTimeSig);
	const [tracks, setTracks] = useState<Record<DrumSound, DrumStep[]>>(
		emptyTracks(defaultTimeSig),
	);
	const [previewing, setPreviewing] = useState(false);
	const previewSeqsRef = useRef<Tone.Sequence<DrumStep>[]>([]);

	// Initialise state when pattern or open changes
	useEffect(() => {
		if (!open) return;
		if (pattern) {
			setName(pattern.name);
			setTimeSig(pattern.timeSignature);
			const ts = pattern.timeSignature;
			setTracks({
				bd: flattenTrack((pattern.tracks.bd ?? emptyTrack(ts)) as (DrumStep | DrumStep[])[], ts),
				sn: flattenTrack((pattern.tracks.sn ?? emptyTrack(ts)) as (DrumStep | DrumStep[])[], ts),
				hh: flattenTrack((pattern.tracks.hh ?? emptyTrack(ts)) as (DrumStep | DrumStep[])[], ts),
				oh: flattenTrack((pattern.tracks.oh ?? emptyTrack(ts)) as (DrumStep | DrumStep[])[], ts),
				rs: flattenTrack((pattern.tracks.rs ?? emptyTrack(ts)) as (DrumStep | DrumStep[])[], ts),
				rd: flattenTrack((pattern.tracks.rd ?? emptyTrack(ts)) as (DrumStep | DrumStep[])[], ts),
				tm: flattenTrack((pattern.tracks.tm ?? emptyTrack(ts)) as (DrumStep | DrumStep[])[], ts),
			});
		} else {
			setName("");
			setTimeSig(defaultTimeSig);
			setTracks(emptyTracks(defaultTimeSig));
		}
		setPreviewing(false);
	}, [open, pattern, defaultTimeSig]);

	// Stop preview when editor closes
	useEffect(() => {
		if (!open) stopPreview();
	}, [open]);

	function handleTimeSig(ts: TimeSignature) {
		setTimeSig(ts);
		setTracks(emptyTracks(ts));
		if (previewing) stopPreview();
	}

	function toggleStep(sound: DrumSound, index: number) {
		setTracks((prev) => {
			const row = [...prev[sound]];
			row[index] = row[index] ? null : sound;
			return { ...prev, [sound]: row };
		});
	}

	// ─── Preview ───────────────────────────────────────────────────────────────

	function buildPreviewPattern(): DrumPattern {
		return {
			id: pattern?.id ?? "__preview__",
			name: name || "Preview",
			timeSignature: timeSig,
			subdivision: "16n",
			tracks: {
				bd: tracks.bd,
				sn: tracks.sn,
				hh: tracks.hh,
				oh: tracks.oh,
				rs: tracks.rs,
				rd: tracks.rd,
				tm: tracks.tm,
			},
		};
	}

	function startPreview() {
		drumEngine.init();
		// Use drumEngine's schedule but we need transport looping at 1 bar
		const pat = buildPreviewPattern();
		drumEngine.schedule(pat);
		const transport = Tone.getTransport();
		transport.loop = true;
		transport.loopStart = 0;
		// 1 bar duration: stepCount steps × 16n each
		const bpm = transport.bpm.value;
		const sixteenthSec = 60 / (bpm * 4);
		transport.loopEnd = stepCount(timeSig) * sixteenthSec;
		if (transport.state !== "started") transport.start();
		setPreviewing(true);
	}

	function stopPreview() {
		drumEngine.clearSequences();
		Tone.getTransport().stop();
		setPreviewing(false);
		for (const s of previewSeqsRef.current) s.dispose();
		previewSeqsRef.current = [];
	}

	function togglePreview() {
		if (previewing) stopPreview();
		else startPreview();
	}

	// Re-schedule preview when tracks change while previewing
	useEffect(() => {
		if (!previewing) return;
		drumEngine.clearSequences();
		drumEngine.schedule(buildPreviewPattern());
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tracks, previewing]);

	// ─── Save / Delete ─────────────────────────────────────────────────────────

	async function handleSave() {
		const id = pattern?.id ?? crypto.randomUUID();
		const saved: DrumPattern = {
			id,
			name: name.trim() || "Custom Pattern",
			timeSignature: timeSig,
			subdivision: "16n",
			tracks: {
				bd: tracks.bd,
				sn: tracks.sn,
				hh: tracks.hh,
				oh: tracks.oh,
				rs: tracks.rs,
				rd: tracks.rd,
				tm: tracks.tm,
			},
		};
		stopPreview();
		await saveCustomPattern(saved);
		onSaved(saved);
	}

	async function handleDelete() {
		if (!pattern) return;
		stopPreview();
		await deleteCustomPattern(pattern.id);
		onDeleted?.(pattern.id);
	}

	// ─── Render ────────────────────────────────────────────────────────────────

	const steps = stepCount(timeSig);
	const groupSize = beatGroupSize(timeSig);

	return (
		<Sheet
			open={open}
			onOpenChange={(o) => {
				if (!o) {
					stopPreview();
					onClose();
				}
			}}
		>
			<SheetContent
				side="bottom"
				className="max-h-[90dvh] overflow-y-auto flex flex-col gap-4"
			>
				<SheetHeader>
					<SheetTitle>{isNew ? "New Drum Pattern" : "Edit Drum Pattern"}</SheetTitle>
				</SheetHeader>

				{/* Name */}
				<div className="flex items-center gap-3">
					<span className="text-sm font-medium shrink-0">Name</span>
					<input
						className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
						placeholder="Pattern name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				{/* Time signature */}
				<div className="flex items-center justify-between gap-2">
					<span className="text-sm font-medium">Time</span>
					<div className="flex gap-1.5">
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

				{/* Step grid */}
				<div className="overflow-x-auto -mx-1 px-1">
					<div className="flex flex-col gap-2" style={{ minWidth: "max-content" }}>
						{DRUM_ROWS.map(({ sound, label }) => (
							<div key={sound} className="flex items-center gap-2">
								<span className="text-xs text-muted-foreground w-12 shrink-0 text-right">
									{label}
								</span>
								<div className="flex gap-0.5">
									{Array.from({ length: steps }, (_, i) => {
										const active = tracks[sound][i] !== null;
										const groupIdx = Math.floor(i / groupSize);
										const inEvenGroup = groupIdx % 2 === 0;
										return (
											<button
												key={i}
												onClick={() => toggleStep(sound, i)}
												className={[
													"w-7 h-7 rounded-sm border transition-colors",
													active
														? "bg-primary border-primary"
														: inEvenGroup
															? "bg-muted/60 border-border hover:bg-muted"
															: "bg-muted/30 border-border hover:bg-muted/50",
												].join(" ")}
											/>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Preview */}
				<Button variant="outline" onClick={togglePreview}>
					{previewing ? "Stop Preview" : "Preview"}
				</Button>

				{/* Actions */}
				<div className="flex gap-2">
					{!isNew && (
						<Button variant="destructive" className="flex-1" onClick={handleDelete}>
							Delete
						</Button>
					)}
					<Button className="flex-1" onClick={handleSave}>
						Save Pattern
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
