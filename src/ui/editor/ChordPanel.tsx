/**
 * ChordPanel.tsx
 * Nashville-number chord input UI.
 *
 * Layout (mobile-first):
 *   [Key / Mode picker row]
 *   [7 diatonic chord buttons — 4 top row, 3 bottom row]
 *   [Context strip — shows current bar's chords or section name]
 *
 * Long-press a chord button → quality-variant popover (adds that variant).
 * Long-press a chip in the context strip → quality-variant popover (replaces that slot).
 * Tapping a button appends a chord to the current bar or creates a new bar.
 */

import { useState, useRef, useCallback, useMemo } from "react";
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
import type { CurrentContext } from "./types";

// ─── Key picker data ────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

type GridButton = ReturnType<typeof buildDiatonicGrid>[number];

// ─── Long-press hook ─────────────────────────────────────────────────────────

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
	instrument: "guitar" | "piano";
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
		<div className="variant-overlay" onPointerDown={onClose}>
			<div
				className="variant-popover"
				onPointerDown={(e) => e.stopPropagation()}
			>
				<div className="variant-popover-title">
					<span className="variant-popover-numeral">{target.numeralLabel}</span>
					<span className="variant-popover-root"> — {target.chord.root}</span>
					<button
						className="variant-play-btn"
						onClick={() => onPlayChord(previewChord)}
						aria-label="Play chord"
					>
						▶
					</button>
				</div>

				{voicing && (
					<div className="variant-diagram-row">
						<GuitarDiagram voicing={voicing} label={chordLabel(previewChord)} />
					</div>
				)}

				<div className="variant-grid">
					{variants.map((v) => (
						<button
							key={v.quality}
							className={[
								"variant-btn",
								v.quality === target.chord.quality
									? "variant-btn--natural"
									: "",
								v.quality === previewChord.quality
									? "variant-btn--previewed"
									: "",
							]
								.filter(Boolean)
								.join(" ")}
							onPointerEnter={() => setPreviewChord(v.chord)}
							onPointerDown={() => setPreviewChord(v.chord)}
							onClick={() => onSelect(v.chord)}
						>
							<span className="variant-btn-name">{v.label}</span>
							{v.quality === target.chord.quality && (
								<span className="variant-btn-tag">natural</span>
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
		<div className="key-picker-overlay" onPointerDown={onClose}>
			<div className="key-picker" onPointerDown={(e) => e.stopPropagation()}>
				<div className="key-picker-grid">
					{ALL_KEYS.map((k) => (
						<button
							key={k}
							className={`key-picker-key${k === currentKey ? " key-picker-key--active" : ""}`}
							onClick={() => onChange(k, currentMode)}
						>
							{k}
						</button>
					))}
				</div>
				<div className="key-picker-modes">
					<button
						className={`key-picker-mode${currentMode === "major" ? " key-picker-mode--active" : ""}`}
						onClick={() => onChange(currentKey, "major")}
					>
						major
					</button>
					<button
						className={`key-picker-mode${currentMode === "minor" ? " key-picker-mode--active" : ""}`}
						onClick={() => onChange(currentKey, "minor")}
					>
						minor
					</button>
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
	// popoverTarget: from grid button long-press (editingSlotIndex = null)
	// or from chip long-press (editingSlotIndex = slot index to replace)
	const [popoverTarget, setPopoverTarget] = useState<GridButton | null>(null);
	const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
	const [popoverInitialChord, setPopoverInitialChord] = useState<
		Chord | undefined
	>(undefined);
	const [showKeyPicker, setShowKeyPicker] = useState(false);

	const playerStore = usePlayerStore();
	const grid = buildDiatonicGrid(song.key, song.mode);

	// Resolve the current bar from song data (live)
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

	// ── Chord input ────────────────────────────────────────────────────────

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
				// No context: create a default section with the chord
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

	// ── Grid long-press ────────────────────────────────────────────────────

	const openGridPopover = useCallback((btn: GridButton) => {
		setEditingSlotIndex(null);
		setPopoverInitialChord(undefined);
		setPopoverTarget(btn);
	}, []);

	const { onDown, onUp, onCancel } = useLongPress(
		(btn: GridButton) => handleChordInput(btn.chord),
		openGridPopover,
	);

	// ── Chip long-press (existing bar slot) ───────────────────────────────

	const chipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const chipDidLong = useRef(false);

	function onChipDown(slotIndex: number) {
		chipDidLong.current = false;
		chipTimer.current = setTimeout(() => {
			chipDidLong.current = true;
			if (currentContext?.type !== "bar") return;
			const slot = currentBar?.slots[slotIndex];
			if (!slot) return;
			// Find grid button for this root
			const btn = grid.find((b) => b.chord.root === slot.chord.root);
			if (!btn) return; // out-of-key chord — skip
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

	// ── Variant popover select ─────────────────────────────────────────────

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

	// ── Single-chord preview ───────────────────────────────────────────────

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

	// ── Key change ─────────────────────────────────────────────────────────

	const handleKeyChange = useCallback(
		async (key: NoteName, mode: ScaleMode) => {
			setShowKeyPicker(false);
			await updateSong(song.id, { key, mode });
		},
		[song.id],
	);

	// ── Delete bar ─────────────────────────────────────────────────────────

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

	// ─────────────────────────────────────────────────────────────────────

	return (
		<div className="chord-panel">
			{/* Key row */}
			<div className="chord-key-row">
				<button
					className="chord-key-btn"
					onClick={() => setShowKeyPicker((v) => !v)}
					aria-expanded={showKeyPicker}
				>
					<span className="chord-key-root">{song.key}</span>
					<span className="chord-key-mode">{song.mode}</span>
					<span className="chord-key-caret" aria-hidden>
						▾
					</span>
				</button>
			</div>

			{/* Nashville chord grid — 4 top, 3 bottom */}
			<div className="chord-grid">
				{grid.map((btn) => (
					<button
						key={btn.numeral}
						className="chord-btn"
						onPointerDown={() => onDown(btn)}
						onPointerUp={() => onUp(btn)}
						onPointerCancel={onCancel}
						onContextMenu={(e) => e.preventDefault()}
					>
						<span className="chord-btn-numeral">{btn.numeralLabel}</span>
						<span className="chord-btn-name">{btn.chordName}</span>
					</button>
				))}
			</div>

			{/* Context strip */}
			<div className="chord-context-strip">
				{currentContext?.type === "bar" && currentBar ? (
					<>
						<div className="chord-context-chips">
							{currentBar.slots.length === 0 ? (
								<span className="chord-context-hint">empty bar</span>
							) : (
								currentBar.slots.map((slot, i) => (
									<button
										key={i}
										className="chord-context-chip"
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
						<button
							className="chord-context-delete"
							onClick={handleDeleteBar}
							aria-label="Delete bar"
						>
							🗑
						</button>
					</>
				) : currentContext?.type === "section" && currentSectionName ? (
					<span className="chord-context-section">→ {currentSectionName}</span>
				) : (
					<span className="chord-context-hint">
						tap a section or bar to focus
					</span>
				)}
			</div>

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
