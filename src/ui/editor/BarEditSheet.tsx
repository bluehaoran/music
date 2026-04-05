/**
 * BarEditSheet.tsx
 * Bottom sheet for editing a bar's chords.
 *
 * - Shows current chords as removable chips (tap to remove)
 * - 7-button chord grid to add chords (diatonic to song key)
 * - Save: rebuilds bar with new chords using even-split slots
 * - Delete: removes the bar entirely
 */

import { useState } from "react";
import { chordLabel } from "../../theory/chords";
import type { Chord } from "../../theory/chords";
import type { Bar, Song } from "../../theory/model";
import { buildDiatonicGrid } from "../../theory/nashville";
import { createBar } from "../../theory/songFactory";
import { replaceBar, removeBar } from "../../data/songRepo";

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
		<div className="bar-edit-overlay" onPointerDown={onClose}>
			<div
				className="bar-edit-sheet"
				onPointerDown={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="bar-edit-header">
					<span className="bar-edit-title">Edit bar</span>
					<button className="bar-edit-close" onClick={onClose}>
						×
					</button>
				</div>

				{/* Current chords */}
				<div className="bar-edit-chords">
					{chords.length === 0 ? (
						<span className="bar-edit-chords-hint">
							Tap below to add chords
						</span>
					) : (
						chords.map((chord, i) => (
							<button
								key={i}
								className="bar-edit-chord-chip"
								onClick={() => removeChord(i)}
								title="Tap to remove"
							>
								{chordLabel(chord)}
								<span className="bar-edit-chip-x">×</span>
							</button>
						))
					)}
				</div>

				{/* Chord grid */}
				<div className="bar-edit-grid">
					{grid.map((btn) => (
						<button
							key={btn.numeral}
							className="bar-edit-chord-btn"
							onClick={() => addChord(btn.chord)}
						>
							<span className="bar-edit-btn-numeral">{btn.numeralLabel}</span>
							<span className="bar-edit-btn-name">{btn.chordName}</span>
						</button>
					))}
				</div>

				{/* Lyric */}
				<input
					className="bar-edit-lyric"
					type="text"
					value={lyric}
					onChange={(e) => setLyric(e.target.value)}
					placeholder="Lyric for this bar…"
					spellCheck
				/>

				{/* Actions */}
				<div className="bar-edit-actions">
					<button className="bar-edit-delete-btn" onClick={handleDelete}>
						Delete bar
					</button>
					<button
						className="bar-edit-save-btn"
						onClick={handleSave}
						disabled={chords.length === 0}
					>
						Save
					</button>
				</div>
			</div>
		</div>
	);
}
