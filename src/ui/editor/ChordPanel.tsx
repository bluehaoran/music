/**
 * ChordPanel.tsx
 * Nashville-number chord input UI.
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { chordLabel } from "../../theory/chords";
import type { Chord } from "../../theory/chords";
import type { Song } from "../../theory/model";
import { getVoicing } from "../../theory/voicings";
import { GuitarDiagram } from "./GuitarDiagram";
import { ticksPerBar } from "../../theory/model";
import { buildDiatonicGrid, variantsForDegree } from "../../theory/nashville";
import type { NashvilleNumeral } from "../../theory/scales";
import type { NoteName, ScaleMode } from "../../theory/notes";
import {
	updateSong,
	addBars,
	addSlotToBar,
	replaceSlotInBar,
	removeBar,
} from "../../data/songRepo";
import { createBar, createPart, createSection } from "../../theory/songFactory";
import { usePlayerStore } from "../../audio/playerStore";
import { Button } from "@/components/ui/button";
import type { CurrentContext } from "./types";

// ─── Key picker data ──────────────────────────────────────────────────────────

const ALL_KEYS: NoteName[] = [
	"C",
	"Db",
	"D",
	"Eb",
	"E",
	"F",
	"F#",
	"G",
	"Ab",
	"A",
	"Bb",
	"B",
];

type GridButton = ReturnType<typeof buildDiatonicGrid>[number];

// ─── Long-press hook ──────────────────────────────────────────────────────────

const LONG_PRESS_MS = 450;

function useLongPress<T>(onTap: (item: T) => void, onLong: (item: T) => void) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLong = useRef(false);

	const onDown = useCallback(
		(item: T) => {
			didLong.current = false;
			timer.current = setTimeout(() => {
				didLong.current = true;
				onLong(item);
			}, LONG_PRESS_MS);
		},
		[onLong],
	);

	const onUp = useCallback(
		(item: T) => {
			if (timer.current) {
				clearTimeout(timer.current);
				timer.current = null;
			}
			if (!didLong.current) onTap(item);
		},
		[onTap],
	);

	const onCancel = useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		didLong.current = false;
	}, []);

	return { onDown, onUp, onCancel };
}

// ─── Variant popover ──────────────────────────────────────────────────────────

interface VariantPopoverProps {
	target: GridButton;
	songKey: NoteName;
	mode: ScaleMode;
	instrument: "guitar" | "piano" | "synth";
	initialChord?: Chord;
	onSelect: (chord: Chord) => void;
	onClose: () => void;
	onPlayChord: (chord: Chord) => void;
}

function VariantPopover({
	target,
	songKey,
	mode,
	instrument,
	initialChord,
	onSelect,
	onClose,
	onPlayChord,
}: VariantPopoverProps) {
	const variants = variantsForDegree(target.numeral, songKey, mode);
	const [previewChord, setPreviewChord] = useState<Chord>(
		initialChord ?? target.chord,
	);

	const voicing =
		instrument === "guitar"
			? getVoicing(previewChord.root, previewChord.quality)
			: null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/60 flex items-end"
			onPointerDown={onClose}
		>
			<div
				className="w-full bg-popover border-t border-border rounded-t-2xl p-4 flex flex-col gap-3"
				onPointerDown={(e) => e.stopPropagation()}
			>
				{/* Title */}
				<div className="flex items-center gap-2">
					<span className="text-base font-semibold text-foreground">
						{target.numeralLabel}
					</span>
					<span className="text-sm text-muted-foreground">
						— {target.chord.root}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="ml-auto size-8"
						onClick={() => onPlayChord(previewChord)}
						aria-label="Play chord"
					>
						▶
					</Button>
				</div>

				{voicing && (
					<div className="flex justify-center">
						<GuitarDiagram voicing={voicing} label={chordLabel(previewChord)} />
					</div>
				)}

				<div className="grid grid-cols-3 gap-2">
					{variants.map((v) => (
						<button
							key={v.quality}
							className={[
								"flex flex-col items-start px-3 py-2 rounded-lg border text-left",
								v.quality === previewChord.quality
									? "border-primary bg-primary/15 text-primary"
									: "border-border bg-muted/50 text-foreground",
							].join(" ")}
							onPointerEnter={() => setPreviewChord(v.chord)}
							onPointerDown={() => setPreviewChord(v.chord)}
							onClick={() => onSelect(v.chord)}
						>
							<span className="text-sm font-medium">{v.label}</span>
							{v.quality === target.chord.quality && (
								<span className="text-xs text-muted-foreground">natural</span>
							)}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Key picker ───────────────────────────────────────────────────────────────

function KeyPicker({
	currentKey,
	currentMode,
	onChange,
	onClose,
}: {
	currentKey: NoteName;
	currentMode: ScaleMode;
	onChange: (key: NoteName, mode: ScaleMode) => void;
	onClose: () => void;
}) {
	return (
		<div
			className="fixed inset-0 z-50 bg-black/60 flex items-end"
			onPointerDown={onClose}
		>
			<div
				className="w-full bg-popover border-t border-border rounded-t-2xl p-4 flex flex-col gap-3"
				onPointerDown={(e) => e.stopPropagation()}
			>
				<div className="grid grid-cols-6 gap-2">
					{ALL_KEYS.map((k) => (
						<button
							key={k}
							className={[
								"py-2 rounded-lg border text-sm font-medium",
								k === currentKey
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-muted/50 text-foreground",
							].join(" ")}
							onClick={() => onChange(k, currentMode)}
						>
							{k}
						</button>
					))}
				</div>
				<div className="flex gap-2">
					{(["major", "minor"] as ScaleMode[]).map((m) => (
						<button
							key={m}
							className={[
								"flex-1 py-2 rounded-lg border text-sm font-medium",
								m === currentMode
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-muted/50 text-foreground",
							].join(" ")}
							onClick={() => onChange(currentKey, m)}
						>
							{m}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── ChordPanel ───────────────────────────────────────────────────────────────

interface Props {
	song: Song;
	currentContext: CurrentContext;
	onContextChange: (ctx: CurrentContext) => void;
}

export function ChordPanel({ song, currentContext, onContextChange }: Props) {
	const [popoverTarget, setPopoverTarget] = useState<GridButton | null>(null);
	const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
	const [popoverInitialChord, setPopoverInitialChord] = useState<
		Chord | undefined
	>(undefined);
	const [showKeyPicker, setShowKeyPicker] = useState(false);
	const [minimized, setMinimized] = useState(() => song.sections.length > 0);

	useEffect(() => {
		if (currentContext !== null) setMinimized(false);
	}, [currentContext]);

	const playerStore = usePlayerStore();
	const grid = buildDiatonicGrid(song.key, song.mode);

	const currentBar = useMemo(() => {
		if (currentContext?.type !== "bar") return null;
		const sec = song.sections.find((s) => s.id === currentContext.sectionId);
		const part = sec?.parts.find((p) => p.id === currentContext.partId);
		return part?.bars.find((b) => b.id === currentContext.barId) ?? null;
	}, [song, currentContext]);

	const currentSectionName = useMemo(() => {
		if (currentContext?.type !== "section") return null;
		return (
			song.sections.find((s) => s.id === currentContext.sectionId)?.name ?? null
		);
	}, [song, currentContext]);

	const handleChordInput = useCallback(
		async (chord: Chord) => {
			if (currentContext?.type === "bar") {
				await addSlotToBar(
					song.id,
					currentContext.sectionId,
					currentContext.partId,
					currentContext.barId,
					chord,
				);
			} else if (currentContext?.type === "section") {
				const sec = song.sections.find(
					(s) => s.id === currentContext.sectionId,
				);
				if (!sec) return;
				const bar = createBar([chord], song.timeSignature);
				const lastPart = sec.parts[sec.parts.length - 1];
				await addBars(song.id, sec.id, lastPart.id, [bar]);
			} else {
				const bar = createBar([chord], song.timeSignature);
				if (song.sections.length === 0) {
					const part = createPart([bar]);
					const section = createSection("Verse", [part]);
					await updateSong(song.id, { sections: [section] });
					onContextChange({ type: "section", sectionId: section.id });
				} else {
					const lastSec = song.sections[song.sections.length - 1];
					const lastPart = lastSec.parts[lastSec.parts.length - 1];
					await addBars(song.id, lastSec.id, lastPart.id, [bar]);
					onContextChange({ type: "section", sectionId: lastSec.id });
				}
			}
		},
		[currentContext, song, onContextChange],
	);

	const openGridPopover = useCallback((btn: GridButton) => {
		setEditingSlotIndex(null);
		setPopoverInitialChord(undefined);
		setPopoverTarget(btn);
	}, []);

	const { onDown, onUp, onCancel } = useLongPress(
		(btn: GridButton) => {
			handleChordInput(btn.chord);
			handlePlayChord(btn.chord);
		},
		openGridPopover,
	);

	const chipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const chipDidLong = useRef(false);

	function onChipDown(slotIndex: number) {
		chipDidLong.current = false;
		chipTimer.current = setTimeout(() => {
			chipDidLong.current = true;
			if (currentContext?.type !== "bar") return;
			const slot = currentBar?.slots[slotIndex];
			if (!slot) return;
			const btn = grid.find((b) => b.chord.root === slot.chord.root);
			if (!btn) return;
			setEditingSlotIndex(slotIndex);
			setPopoverInitialChord(slot.chord);
			setPopoverTarget(btn);
		}, LONG_PRESS_MS);
	}

	function onChipUp() {
		if (chipTimer.current) {
			clearTimeout(chipTimer.current);
			chipTimer.current = null;
		}
		chipDidLong.current = false;
	}

	const handleVariantSelect = useCallback(
		async (chord: Chord) => {
			setPopoverTarget(null);
			if (editingSlotIndex !== null && currentContext?.type === "bar") {
				await replaceSlotInBar(
					song.id,
					currentContext.sectionId,
					currentContext.partId,
					currentContext.barId,
					editingSlotIndex,
					chord,
				);
			} else {
				await handleChordInput(chord);
			}
			setEditingSlotIndex(null);
			setPopoverInitialChord(undefined);
		},
		[editingSlotIndex, currentContext, song, handleChordInput],
	);

	const handlePlayChord = useCallback(
		async (chord: Chord) => {
			const tpb = ticksPerBar(song.timeSignature);
			const bar = {
				id: "pc0",
				slots: [{ chord, startTick: 0, durationTicks: tpb }],
			};
			const part = { id: "pcp", bars: [bar], repeatCount: 1 };
			const section = { id: "pcs", name: "Preview", parts: [part] };
			await playerStore.play({
				...song,
				id: `${song.id}__chord`,
				sections: [section],
			});
		},
		[song, playerStore],
	);

	const handleKeyChange = useCallback(
		async (key: NoteName, mode: ScaleMode) => {
			setShowKeyPicker(false);
			await updateSong(song.id, { key, mode });
		},
		[song.id],
	);

	const handleDeleteBar = useCallback(async () => {
		if (currentContext?.type !== "bar") return;
		if (!window.confirm("Delete this bar?")) return;
		await removeBar(
			song.id,
			currentContext.sectionId,
			currentContext.partId,
			currentContext.barId,
		);
		onContextChange({ type: "section", sectionId: currentContext.sectionId });
	}, [currentContext, song, onContextChange]);

	return (
		<div className="border-t border-border bg-card flex flex-col">
			{/* Context strip */}
			<div className="flex items-center gap-2 px-3 py-2 border-b border-border min-h-[44px]">
				{currentContext?.type === "bar" && currentBar ? (
					<>
						<div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
							{currentBar.slots.length === 0 ? (
								<span className="text-xs text-muted-foreground">empty bar</span>
							) : (
								currentBar.slots.map((slot, i) => (
									<button
										key={i}
										className="px-2.5 py-1 rounded-md bg-muted text-sm font-medium text-foreground border border-border select-none"
										onPointerDown={() => onChipDown(i)}
										onPointerUp={onChipUp}
										onPointerCancel={onChipUp}
										onContextMenu={(e) => e.preventDefault()}
										title="Long-press to change variant"
									>
										{chordLabel(slot.chord)}
									</button>
								))
							)}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-muted-foreground hover:text-destructive shrink-0"
							onClick={handleDeleteBar}
							aria-label="Delete bar"
						>
							🗑
						</Button>
					</>
				) : currentContext?.type === "section" && currentSectionName ? (
					<span className="text-sm text-muted-foreground flex-1">
						→ {currentSectionName}
					</span>
				) : (
					<span className="text-xs text-muted-foreground flex-1">
						tap a section or bar to focus
					</span>
				)}

				<Button
					variant="ghost"
					size="icon"
					className="size-8 shrink-0"
					onClick={() => setMinimized((v) => !v)}
					aria-label={minimized ? "Expand chord panel" : "Minimize chord panel"}
				>
					{minimized ? "+" : "−"}
				</Button>
			</div>

			{!minimized && (
				<>
					{/* Key row */}
					<div className="px-3 pt-2">
						<button
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm"
							onClick={() => setShowKeyPicker((v) => !v)}
							aria-expanded={showKeyPicker}
						>
							<span className="font-semibold text-foreground">{song.key}</span>
							<span className="text-muted-foreground">{song.mode}</span>
							<span className="text-muted-foreground text-xs" aria-hidden>
								▾
							</span>
						</button>
					</div>

					{/* Chord grid — 4 top, 3 bottom */}
					<div className="keyboard grid grid-cols-4 gap-2 p-3">
						{grid.slice(0, 4).map((btn) => (
							<button
								key={btn.numeral}
								className="key flex flex-col items-center justify-center py-3 rounded-xl border border-border bg-muted/40 active:bg-primary/20 select-none touch-none"
								onPointerDown={() => onDown(btn)}
								onPointerUp={() => onUp(btn)}
								onPointerCancel={onCancel}
								onContextMenu={(e) => e.preventDefault()}
							>
								<span className="text-base font-bold text-foreground leading-tight">
									{btn.chordName}
								</span>
								<span className="text-xs text-muted-foreground leading-tight">
									({btn.numeralLabel})
								</span>
							</button>
						))}
					</div>
					<div className="keyboard grid grid-cols-3 gap-2 px-3 pb-3">
						{grid.slice(4).map((btn) => (
							<button
								key={btn.numeral}
								className="key flex flex-col items-center justify-center py-3 rounded-xl border border-border bg-muted/40 active:bg-primary/20 select-none touch-none"
								onPointerDown={() => onDown(btn)}
								onPointerUp={() => onUp(btn)}
								onPointerCancel={onCancel}
								onContextMenu={(e) => e.preventDefault()}
							>
								<span className="text-base font-bold text-foreground leading-tight">
									{btn.chordName}
								</span>
								<span className="text-xs text-muted-foreground leading-tight">
									({btn.numeralLabel})
								</span>
							</button>
						))}
					</div>
				</>
			)}

			{/* Overlays */}
			{showKeyPicker && (
				<KeyPicker
					currentKey={song.key}
					currentMode={song.mode}
					onChange={handleKeyChange}
					onClose={() => setShowKeyPicker(false)}
				/>
			)}

			{popoverTarget && (
				<VariantPopover
					target={popoverTarget}
					songKey={song.key}
					mode={song.mode}
					instrument={song.instrument}
					initialChord={popoverInitialChord}
					onSelect={handleVariantSelect}
					onClose={() => {
						setPopoverTarget(null);
						setEditingSlotIndex(null);
						setPopoverInitialChord(undefined);
					}}
					onPlayChord={handlePlayChord}
				/>
			)}
		</div>
	);
}
