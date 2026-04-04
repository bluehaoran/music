/**
 * chords.ts
 * Chord types, interval stacks, and MIDI note resolution.
 */

import { type NoteName, noteToSemitone, spellNote } from "./notes";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChordQuality =
	| "maj" // major triad (C E G)
	| "min" // minor triad (C Eb G)
	| "dom7" // dominant 7th (C E G Bb)
	| "maj7" // major 7th (C E G B)
	| "min7" // minor 7th (C Eb G Bb)
	| "dim" // diminished triad (C Eb Gb)
	| "aug" // augmented triad (C E G#)
	| "sus2" // suspended 2nd (C D G)
	| "sus4" // suspended 4th (C F G)
	| "add9" // add9 (C E G D)
	| "min7b5"; // half-diminished (C Eb Gb Bb)

export interface Chord {
	root: NoteName;
	quality: ChordQuality;
}

// ─── Interval stacks ────────────────────────────────────────────────────────

/**
 * Semitone intervals above the root for each chord quality.
 * These produce the notes of the chord in close position.
 */
export const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
	maj: [0, 4, 7],
	min: [0, 3, 7],
	dom7: [0, 4, 7, 10],
	maj7: [0, 4, 7, 11],
	min7: [0, 3, 7, 10],
	dim: [0, 3, 6],
	aug: [0, 4, 8],
	sus2: [0, 2, 7],
	sus4: [0, 5, 7],
	add9: [0, 4, 7, 14], // 14 = major 9th (octave + major 2nd)
	min7b5: [0, 3, 6, 10],
};

// ─── Display labels ─────────────────────────────────────────────────────────

/**
 * Suffix appended to the root when displaying chord names.
 * 'maj' has no suffix (C, not Cmaj).
 */
export const QUALITY_SUFFIX: Record<ChordQuality, string> = {
	maj: "",
	min: "m",
	dom7: "7",
	maj7: "maj7",
	min7: "m7",
	dim: "°",
	aug: "+",
	sus2: "sus2",
	sus4: "sus4",
	add9: "add9",
	min7b5: "ø7",
};

/**
 * Nashville numeral suffix for a chord quality.
 * Minor qualities use lowercase numerals by convention.
 */
export const QUALITY_NUMERAL_CASE: Record<ChordQuality, "upper" | "lower"> = {
	maj: "upper",
	min: "lower",
	dom7: "upper",
	maj7: "upper",
	min7: "lower",
	dim: "lower",
	aug: "upper",
	sus2: "upper",
	sus4: "upper",
	add9: "upper",
	min7b5: "lower",
};

// ─── MIDI resolution ────────────────────────────────────────────────────────

const MIDI_MIDDLE_C = 60; // C4

/**
 * Resolve a chord to an array of MIDI note numbers.
 * Default octave 4 (middle C area). The root is placed at
 * the closest note ≥ octave root; upper voices stack above.
 */
export function chordToMidi(chord: Chord, octave = 4): number[] {
	const rootSemitone = noteToSemitone(chord.root);
	const rootMidi = rootSemitone + (octave + 1) * 12; // +1: MIDI octave offset (C4=60)
	return QUALITY_INTERVALS[chord.quality].map((interval) => {
		// add9 has a 14-semitone interval; keep it in the next octave naturally
		return rootMidi + interval;
	});
}

// ─── Display helpers ────────────────────────────────────────────────────────

/** Format a chord as a display string, e.g. "Am7", "Gsus4", "C" */
export function chordLabel(chord: Chord): string {
	return `${chord.root}${QUALITY_SUFFIX[chord.quality]}`;
}

/**
 * Format a Nashville numeral label, e.g. "IV", "ii", "Vsus4", "bVII"
 * @param numeral   1–7
 * @param quality   chord quality (determines case)
 * @param isInKey   false if the root is outside the diatonic scale (adds accidental)
 * @param accidental  'b' | '#' | '' — prefix for out-of-key roots
 */
/**
 * Nashville numeral suffixes exclude the quality marker that's already
 * encoded in the case (upper = major-family, lower = minor-family).
 * e.g. 'min' → lowercase roman, no extra suffix; 'min7' → lowercase + '7'
 */
export const QUALITY_NUMERAL_SUFFIX: Record<ChordQuality, string> = {
	maj: "",
	min: "", // case alone signals minor
	dom7: "7",
	maj7: "maj7",
	min7: "7", // lowercase + 7 = m7 in Nashville convention
	dim: "°",
	aug: "+",
	sus2: "sus2",
	sus4: "sus4",
	add9: "add9",
	min7b5: "ø7",
};

export function numeralLabel(
	numeral: number,
	quality: ChordQuality,
	accidental: "" | "b" | "#" = "",
): string {
	const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
	const roman = ROMAN[numeral - 1];
	const cased =
		QUALITY_NUMERAL_CASE[quality] === "lower" ? roman.toLowerCase() : roman;
	const suffix = QUALITY_NUMERAL_SUFFIX[quality];
	return `${accidental}${cased}${suffix}`;
}

/**
 * Attempt to spell the chord notes using the given key context.
 * Returns note names as they'd appear in the key's enharmonic convention.
 */
export function chordNoteNames(chord: Chord, key: NoteName): NoteName[] {
	const rootSemitone = noteToSemitone(chord.root);
	return QUALITY_INTERVALS[chord.quality].map((interval) =>
		spellNote((rootSemitone + interval) % 12, key),
	);
}
