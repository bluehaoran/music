/**
 * ChordPanel.tsx
 * Nashville-number chord input UI.
 *
 * Layout (mobile-first):
 *   [Key / Mode picker row]
 *   [7 diatonic chord buttons — 4 top row, 3 bottom row]
 *   [Pending chord strip — tap a chord to remove]
 *   [Clear | Loop / Stop]
 *
 * Long-press a chord button → quality-variant popover.
 * Tapping a button (or variant) appends the chord to the pending queue.
 * "Loop" builds a transient Song from pending chords and plays via audioEngine.
 */

import { useState, useRef, useCallback } from "react";
import { chordLabel, QUALITY_SUFFIX } from "../../theory/chords";
import type { Chord, ChordQuality } from "../../theory/chords";
import type { Song, Bar, Part, Section } from "../../theory/model";
import { getVoicing } from "../../theory/voicings";
import { GuitarDiagram } from "./GuitarDiagram";
import { ticksPerBar } from "../../theory/model";
import {
	buildDiatonicGrid,
	variantsForDegree,
} from "../../theory/nashville";
import type { NashvilleNumeral } from "../../theory/scales";
import type { NoteName, ScaleMode } from "../../theory/notes";
import { updateSong, saveChordsToArrangement } from "../../data/songRepo";
import { usePlayerStore } from "../../audio/playerStore";

// ─── Key picker data ────────────────────────────────────────────────────────

const ALL_KEYS: NoteName[] = [
	"C", "Db", "D", "Eb", "E", "F",
	"F#", "G", "Ab", "A", "Bb", "B",
];

// ─── Types ───────────────────────────────────────────────────────────────────

type GridButton = ReturnType<typeof buildDiatonicGrid>[number];

// ─── Long-press hook ─────────────────────────────────────────────────────────

const LONG_PRESS_MS = 450;

function useLongPress(
	onTap: (btn: GridButton) => void,
	onLong: (btn: GridButton) => void,
) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLong = useRef(false);

	const onDown = useCallback(
		(btn: GridButton) => {
			didLong.current = false;
			timer.current = setTimeout(() => {
				didLong.current = true;
				onLong(btn);
			}, LONG_PRESS_MS);
		},
		[onLong],
	);

	const onUp = useCallback(
		(btn: GridButton) => {
			if (timer.current) {
				clearTimeout(timer.current);
				timer.current = null;
			}
			if (!didLong.current) onTap(btn);
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
	onSelect: (chord: Chord) => void;
	onClose: () => void;
}

function VariantPopover({ target, songKey, mode, instrument, onSelect, onClose }: VariantPopoverProps) {
	const variants = variantsForDegree(target.numeral, songKey, mode);
	const [previewChord, setPreviewChord] = useState<Chord>(target.chord);

	const voicing =
		instrument === "guitar"
			? getVoicing(previewChord.root, previewChord.quality)
			: null;

	return (
		<div className="variant-overlay" onPointerDown={onClose}>
			<div className="variant-popover" onPointerDown={(e) => e.stopPropagation()}>
				<div className="variant-popover-title">
					<span className="variant-popover-numeral">{target.numeralLabel}</span>
					<span className="variant-popover-root"> — {target.chord.root}</span>
				</div>

				{/* Guitar diagram preview */}
				{voicing && (
					<div className="variant-diagram-row">
						<GuitarDiagram
							voicing={voicing}
							label={chordLabel(previewChord)}
						/>
					</div>
				)}

				<div className="variant-grid">
					{variants.map((v) => (
						<button
							key={v.quality}
							className={`variant-btn${v.quality === target.chord.quality ? " variant-btn--natural" : ""}${v.quality === previewChord.quality ? " variant-btn--previewed" : ""}`}
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

interface KeyPickerProps {
	currentKey: NoteName;
	currentMode: ScaleMode;
	onChange: (key: NoteName, mode: ScaleMode) => void;
	onClose: () => void;
}

function KeyPicker({ currentKey, currentMode, onChange, onClose }: KeyPickerProps) {
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
}

export function ChordPanel({ song }: Props) {
	const [pendingChords, setPendingChords] = useState<Chord[]>([]);
	const [popoverTarget, setPopoverTarget] = useState<GridButton | null>(null);
	const [showKeyPicker, setShowKeyPicker] = useState(false);

	const playerStore = usePlayerStore();

	const grid = buildDiatonicGrid(song.key, song.mode);

	// ── Chord tapping ──────────────────────────────────────────────────────

	const addChord = useCallback((chord: Chord) => {
		setPendingChords((prev) => [...prev, chord]);
	}, []);

	const openPopover = useCallback((btn: GridButton) => {
		setPopoverTarget(btn);
	}, []);

	const { onDown, onUp, onCancel } = useLongPress(
		(btn) => addChord(btn.chord),
		openPopover,
	);

	const handleVariantSelect = useCallback(
		(chord: Chord) => {
			addChord(chord);
			setPopoverTarget(null);
		},
		[addChord],
	);

	// ── Key change ─────────────────────────────────────────────────────────

	const handleKeyChange = useCallback(
		async (key: NoteName, mode: ScaleMode) => {
			setShowKeyPicker(false);
			await updateSong(song.id, { key, mode });
		},
		[song.id],
	);

	// ── Playback ───────────────────────────────────────────────────────────

	const handleSave = useCallback(async () => {
		if (pendingChords.length === 0) return;
		await saveChordsToArrangement(song, pendingChords);
		setPendingChords([]);
	}, [pendingChords, song]);

	const handleLoop = useCallback(async () => {
		if (pendingChords.length === 0) return;
		const tpb = ticksPerBar(song.timeSignature);
		const bars: Bar[] = pendingChords.map((chord, i) => ({
			id: `p${i}`,
			slots: [{ chord, startTick: 0, durationTicks: tpb }],
		}));
		const part: Part = { id: "pp", bars, repeatCount: 1 };
		const section: Section = { id: "ps", name: "Verse", parts: [part] };
		const loopSong: Song = {
			...song,
			id: `${song.id}__loop`,
			sections: [section],
		};
		await playerStore.play(loopSong);
	}, [pendingChords, song, playerStore]);

	const isPlaying = playerStore.state === "playing";
	const isLoading = playerStore.isLoading;

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
					<span className="chord-key-caret" aria-hidden>▾</span>
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
						touch-action="none"
					>
						<span className="chord-btn-numeral">{btn.numeralLabel}</span>
						<span className="chord-btn-name">{btn.chordName}</span>
					</button>
				))}
			</div>

			{/* Pending chord strip */}
			<div className="chord-pending-wrap">
				<div className="chord-pending">
					{pendingChords.length === 0 ? (
						<span className="chord-pending-hint">tap chords above to queue</span>
					) : (
						pendingChords.map((chord, i) => (
							<button
								key={i}
								className="chord-pending-item"
								onClick={() =>
									setPendingChords((prev) => prev.filter((_, j) => j !== i))
								}
								title="tap to remove"
							>
								{chordLabel(chord)}
							</button>
						))
					)}
				</div>
			</div>

			{/* Action bar */}
			<div className="chord-action-bar">
				<button
					className="chord-clear-btn"
					onClick={() => {
						setPendingChords([]);
						if (isPlaying) playerStore.stop();
					}}
					disabled={pendingChords.length === 0 && !isPlaying}
				>
					Clear
				</button>

				<button
					className="chord-save-btn"
					onClick={handleSave}
					disabled={pendingChords.length === 0}
				>
					Save ↑
				</button>

				{isPlaying ? (
					<button className="chord-stop-btn" onClick={() => playerStore.stop()}>
						■ Stop
					</button>
				) : (
					<button
						className="chord-loop-btn"
						onClick={handleLoop}
						disabled={pendingChords.length === 0 || isLoading}
					>
						{isLoading ? "Loading…" : "▶ Loop"}
					</button>
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
					onSelect={handleVariantSelect}
					onClose={() => setPopoverTarget(null)}
				/>
			)}
		</div>
	);
}
