/**
 * SongSettingsSheet.tsx
 * Bottom sheet for song-level settings: instrument, capo, BPM, time sig, drums.
 * Changes are batched and applied on "Done".
 */

import { useState } from "react";
import type { Song, TimeSignature } from "../../theory/model";
import { updateSong } from "../../data/songRepo";
import { patternsForTimeSig } from "../../audio/drums";

interface Props {
	song: Song;
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

export function SongSettingsSheet({ song, onClose, onExport }: Props) {
	const [instrument, setInstrument] = useState(song.instrument);
	const [capo, setCapo] = useState(song.capo);
	const [bpm, setBpm] = useState(song.bpm);
	const [timeSig, setTimeSig] = useState<TimeSignature>(song.timeSignature);
	const [drumPatternId, setDrumPatternId] = useState(song.drumPatternId);

	// Recalculate drum options when time sig changes
	const drumPatterns = patternsForTimeSig(timeSig);

	// If current drum selection is incompatible with new time sig, clear it
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

	return (
		<div className="settings-overlay" onPointerDown={onClose}>
			<div className="settings-sheet" onPointerDown={(e) => e.stopPropagation()}>

				{/* Header */}
				<div className="settings-header">
					<span className="settings-title">Song Settings</span>
					<button className="settings-close" onClick={onClose} aria-label="Close">×</button>
				</div>

				{/* Instrument */}
				<div className="settings-row">
					<span className="settings-label">Instrument</span>
					<div className="settings-segmented">
						<button
							className={`settings-seg-btn${instrument === "guitar" ? " settings-seg-btn--active" : ""}`}
							onClick={() => setInstrument("guitar")}
						>
							Guitar
						</button>
						<button
							className={`settings-seg-btn${instrument === "piano" ? " settings-seg-btn--active" : ""}`}
							onClick={() => setInstrument("piano")}
						>
							Piano
						</button>
					</div>
				</div>

				{/* Capo — guitar only */}
				{instrument === "guitar" && (
					<div className="settings-row">
						<span className="settings-label">Capo</span>
						<div className="settings-stepper">
							<button
								className="settings-step-btn"
								onClick={() => setCapo((c) => Math.max(0, c - 1))}
								disabled={capo === 0}
							>
								−
							</button>
							<span className="settings-step-val">
								{capo === 0 ? "None" : `Fret ${capo}`}
							</span>
							<button
								className="settings-step-btn"
								onClick={() => setCapo((c) => Math.min(7, c + 1))}
								disabled={capo === 7}
							>
								+
							</button>
						</div>
					</div>
				)}

				{/* BPM */}
				<div className="settings-row">
					<span className="settings-label">Tempo</span>
					<div className="settings-stepper">
						<button
							className="settings-step-btn"
							onClick={() => setBpm((b) => Math.max(40, b - 5))}
							disabled={bpm <= 40}
						>
							−
						</button>
						<span className="settings-step-val">{bpm} BPM</span>
						<button
							className="settings-step-btn"
							onClick={() => setBpm((b) => Math.min(240, b + 5))}
							disabled={bpm >= 240}
						>
							+
						</button>
					</div>
				</div>

				{/* Time signature */}
				<div className="settings-row">
					<span className="settings-label">Time</span>
					<div className="settings-chip-row">
						{TIME_SIGS.map((ts) => (
							<button
								key={tsLabel(ts)}
								className={`settings-chip${tsEqual(ts, timeSig) ? " settings-chip--active" : ""}`}
								onClick={() => handleTimeSig(ts)}
							>
								{tsLabel(ts)}
							</button>
						))}
					</div>
				</div>

				{/* Drum pattern */}
				<div className="settings-row settings-row--wrap">
					<span className="settings-label">Drums</span>
					<div className="settings-chip-row">
						<button
							className={`settings-chip${drumPatternId === null ? " settings-chip--active" : ""}`}
							onClick={() => setDrumPatternId(null)}
						>
							Off
						</button>
						{drumPatterns.map((p) => (
							<button
								key={p.id}
								className={`settings-chip${drumPatternId === p.id ? " settings-chip--active" : ""}`}
								onClick={() => setDrumPatternId(p.id)}
							>
								{p.name}
							</button>
						))}
					</div>
				</div>

				<button className="settings-export-btn" onClick={onExport}>
					Export ChordPro
				</button>

				<button className="settings-done-btn" onClick={handleDone}>
					Done
				</button>
			</div>
		</div>
	);
}
