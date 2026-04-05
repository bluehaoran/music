/**
 * scales.ts
 * Scale construction and Nashville numeral mapping.
 * Supports major and minor (natural minor) in v1.
 */

import { type ChordQuality } from "./chords";
import {
	type NoteName,
	noteToSemitone,
	type ScaleMode,
	spellNote,
} from "./notes";

export type NashvilleNumeral = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Semitone intervals above the root for each scale degree. */
export const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10], // natural minor
};

/**
 * The naturally occurring chord quality for each scale degree.
 * Degree index is 0-based (degree 1 = index 0).
 *
 * major: I   ii  iii IV  V   vi  vii°
 * minor: i   ii° III iv  v   VI  VII
 */
export const NATURAL_QUALITIES: Record<ScaleMode, ChordQuality[]> = {
	major: ["maj", "min", "min", "maj", "maj", "min", "dim"],
	minor: ["min", "dim", "maj", "min", "min", "maj", "maj"],
};

/**
 * For a minor key root, return the relative major key for enharmonic spelling.
 * e.g. A minor → C major (no sharps/flats), D minor → F major (one flat).
 * The relative major is always 3 semitones above the minor root.
 */
function relativeMajorKey(minorRoot: NoteName): NoteName {
	// Relative major = minor root + 3 semitones
	const relativeSemitone = (noteToSemitone(minorRoot) + 3) % 12;
	// Use the sharp scale to get the name, then check if it's a known flat key
	const sharpName = (
		[
			"C",
			"C#",
			"D",
			"D#",
			"E",
			"F",
			"F#",
			"G",
			"G#",
			"A",
			"A#",
			"B",
		] as NoteName[]
	)[relativeSemitone];
	// Map enharmonic equivalents to their conventional major key name
	const ENHARMONIC: Partial<Record<NoteName, NoteName>> = {
		"C#": "Db",
		"D#": "Eb",
		"F#": "Gb",
		"G#": "Ab",
		"A#": "Bb",
	};
	// The relative major flat keys: C minor → Eb major, G minor → Bb major, etc.
	// We want the conventional spelling of the relative major.
	// Flat major keys by semitone: F=5, Bb=10, Eb=3, Ab=8, Db=1, Gb=6, Cb=11
	const FLAT_MAJOR_SEMITONES = new Set([5, 10, 3, 8, 1, 6, 11]);
	if (FLAT_MAJOR_SEMITONES.has(relativeSemitone)) {
		return (ENHARMONIC[sharpName] ?? sharpName) as NoteName;
	}
	return sharpName;
}

/**
 * Build the 7 scale degree note names for a given key and mode.
 * Returned array is 0-indexed: index 0 = degree I.
 * Uses key-appropriate enharmonic spelling throughout.
 */
export function buildScale(key: NoteName, mode: ScaleMode): NoteName[] {
	const rootSemitone = noteToSemitone(key);
	// For minor keys, spell using the relative major key's convention
	const spellingKey = mode === "minor" ? relativeMajorKey(key) : key;
	return SCALE_INTERVALS[mode].map((interval) =>
		spellNote((rootSemitone + interval) % 12, spellingKey),
	);
}

/**
 * Return the note name for a given Nashville numeral in a key.
 * e.g. numeral 4, key G major → C
 */
export function numeralToNote(
	numeral: NashvilleNumeral,
	key: NoteName,
	mode: ScaleMode,
): NoteName {
	return buildScale(key, mode)[numeral - 1];
}

/**
 * Return the natural quality for a Nashville numeral in a mode.
 * e.g. numeral 5 in major → 'dom7'
 */
export function naturalQuality(
	numeral: NashvilleNumeral,
	mode: ScaleMode,
): ChordQuality {
	return NATURAL_QUALITIES[mode][numeral - 1];
}

/**
 * Given a root note, return which Nashville numeral it corresponds to
 * in the given key, or null if the root is not in the scale.
 */
export function noteToNumeral(
	root: NoteName,
	key: NoteName,
	mode: ScaleMode,
): NashvilleNumeral | null {
	const scale = buildScale(key, mode);
	const idx = scale.indexOf(root);
	if (idx === -1) return null;
	return (idx + 1) as NashvilleNumeral;
}
