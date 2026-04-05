/**
 * voicings.ts
 * Standard guitar chord voicings.
 *
 * Format: [E2, A2, D3, G3, B3, e4] — 6 strings low to high.
 * -1 = muted (x), 0 = open, positive = fret number.
 */

import type { ChordQuality } from "./chords";
import type { NoteName } from "./notes";

export type Voicing = readonly [number, number, number, number, number, number];

// ─── Open / barre voicing library ────────────────────────────────────────────

const LIBRARY: Record<string, Voicing> = {
	// ── Major ────────────────────────────────────────────────────────────────
	"C:maj":  [-1, 3, 2, 0, 1, 0],
	"D:maj":  [-1, -1, 0, 2, 3, 2],
	"E:maj":  [0, 2, 2, 1, 0, 0],
	"F:maj":  [1, 1, 2, 3, 3, 1],
	"G:maj":  [3, 2, 0, 0, 3, 3],
	"A:maj":  [-1, 0, 2, 2, 2, 0],
	"B:maj":  [-1, 2, 4, 4, 4, 2],
	"Bb:maj": [-1, 1, 3, 3, 3, 1],
	"Ab:maj": [4, 6, 6, 5, 4, 4],
	"Db:maj": [-1, 4, 6, 6, 6, 4],
	"Eb:maj": [-1, 6, 8, 8, 8, 6],
	"F#:maj": [2, 4, 4, 3, 2, 2],
	"Gb:maj": [2, 4, 4, 3, 2, 2],

	// ── Minor ────────────────────────────────────────────────────────────────
	"A:min":  [-1, 0, 2, 2, 1, 0],
	"B:min":  [-1, 2, 4, 4, 3, 2],
	"C:min":  [-1, 3, 5, 5, 4, 3],
	"D:min":  [-1, -1, 0, 2, 3, 1],
	"E:min":  [0, 2, 2, 0, 0, 0],
	"F:min":  [1, 3, 3, 1, 1, 1],
	"G:min":  [3, 5, 5, 3, 3, 3],
	"Ab:min": [4, 6, 6, 4, 4, 4],
	"Bb:min": [6, 8, 8, 6, 6, 6],
	"Db:min": [-1, 4, 6, 6, 5, 4],
	"Eb:min": [-1, 6, 8, 8, 7, 6],
	"F#:min": [2, 4, 4, 2, 2, 2],
	"Gb:min": [2, 4, 4, 2, 2, 2],

	// ── Dominant 7th ─────────────────────────────────────────────────────────
	"C:dom7":  [-1, 3, 2, 3, 1, 0],
	"D:dom7":  [-1, -1, 0, 2, 1, 2],
	"E:dom7":  [0, 2, 0, 1, 0, 0],
	"F:dom7":  [1, 1, 2, 1, 1, 1],
	"G:dom7":  [3, 2, 0, 0, 0, 1],
	"A:dom7":  [-1, 0, 2, 0, 2, 0],
	"B:dom7":  [-1, 2, 1, 2, 0, 2],
	"Bb:dom7": [-1, 1, 3, 1, 3, 1],
	"F#:dom7": [2, 4, 2, 3, 2, 2],
	"Gb:dom7": [2, 4, 2, 3, 2, 2],

	// ── Major 7th ────────────────────────────────────────────────────────────
	"C:maj7":  [-1, 3, 2, 0, 0, 0],
	"D:maj7":  [-1, -1, 0, 2, 2, 2],
	"E:maj7":  [0, 2, 1, 1, 0, 0],
	"F:maj7":  [-1, -1, 3, 2, 1, 0],
	"G:maj7":  [3, 2, 0, 0, 0, 2],
	"A:maj7":  [-1, 0, 2, 1, 2, 0],
	"B:maj7":  [-1, 2, 4, 3, 4, 2],

	// ── Minor 7th ────────────────────────────────────────────────────────────
	"A:min7":  [-1, 0, 2, 0, 1, 0],
	"B:min7":  [-1, 2, 4, 2, 3, 2],
	"C:min7":  [-1, 3, 5, 3, 4, 3],
	"D:min7":  [-1, -1, 0, 2, 1, 1],
	"E:min7":  [0, 2, 2, 0, 3, 0],
	"F:min7":  [1, 3, 3, 1, 4, 1],
	"G:min7":  [3, 5, 3, 3, 3, 3],

	// ── Diminished ───────────────────────────────────────────────────────────
	"B:dim":   [-1, 2, 3, 4, 3, -1],
	"D:dim":   [-1, -1, 0, 1, 0, 1],
	"F:dim":   [-1, -1, 3, 4, 3, -1],
	"G#:dim":  [-1, -1, 1, 2, 1, -1],
	"Ab:dim":  [-1, -1, 1, 2, 1, -1],

	// ── Augmented ────────────────────────────────────────────────────────────
	"C:aug":   [-1, 3, 2, 1, 1, 0],
	"E:aug":   [0, 3, 2, 1, 1, 0],
	"G:aug":   [3, 2, 1, 0, 0, -1],
	"Ab:aug":  [4, 3, 2, 1, 1, -1],

	// ── sus2 ─────────────────────────────────────────────────────────────────
	"A:sus2":  [-1, 0, 2, 2, 0, 0],
	"B:sus2":  [-1, 2, 4, 4, 2, 2],
	"C:sus2":  [-1, 3, 5, 5, 3, 3],
	"D:sus2":  [-1, -1, 0, 2, 3, 0],
	"E:sus2":  [0, 2, 4, 4, 0, 0],
	"G:sus2":  [3, 2, 0, 0, 3, 1],

	// ── sus4 ─────────────────────────────────────────────────────────────────
	"A:sus4":  [-1, 0, 2, 2, 3, 0],
	"D:sus4":  [-1, -1, 0, 2, 3, 3],
	"E:sus4":  [0, 2, 2, 2, 0, 0],
	"G:sus4":  [3, 3, 0, 0, 3, 3],

	// ── add9 ─────────────────────────────────────────────────────────────────
	"C:add9":  [-1, 3, 2, 0, 3, 0],
	"D:add9":  [-1, -1, 0, 2, 3, 0],
	"G:add9":  [3, 2, 0, 2, 3, 3],
	"A:add9":  [-1, 0, 2, 4, 2, 0],

	// ── min7b5 (half-diminished) ──────────────────────────────────────────────
	"B:min7b5": [-1, 2, 3, 2, 3, -1],
	"E:min7b5": [0, 1, 2, 0, 3, 0],
};

// ─── E-shape barre fallback ───────────────────────────────────────────────────

/** Semitones from open low-E to each note name. */
const ROOT_TO_BARRE: Partial<Record<NoteName, number>> = {
	E: 0, F: 1, "F#": 2, Gb: 2, G: 3, "G#": 4, Ab: 4,
	A: 5, "A#": 6, Bb: 6, B: 7, C: 8, "C#": 9, Db: 9,
	D: 10, "D#": 11, Eb: 11,
};

/**
 * Fret offsets from barre position for each quality (E-shape barre).
 * Only the most common qualities have a reliable E-shape template.
 */
const EBARRE: Partial<Record<ChordQuality, readonly [number, number, number, number, number, number]>> = {
	maj:  [0, 2, 2, 1, 0, 0],
	min:  [0, 2, 2, 0, 0, 0],
	dom7: [0, 2, 0, 1, 0, 0],
	maj7: [0, 2, 1, 1, 0, 0],
	min7: [0, 2, 2, 0, 3, 0],
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getVoicing(root: NoteName, quality: ChordQuality): Voicing | null {
	const lib = LIBRARY[`${root}:${quality}`];
	if (lib) return lib;

	const barreFret = ROOT_TO_BARRE[root];
	const offsets = EBARRE[quality];
	if (barreFret === undefined || !offsets) return null;

	return offsets.map((off) => barreFret + off) as unknown as Voicing;
}
