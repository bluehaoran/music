/**
 * notes.ts
 * Core note primitives: names, semitone mapping, enharmonic spelling.
 * No framework dependencies.
 */

export type NoteName =
	| "C"
	| "C#"
	| "Db"
	| "D"
	| "D#"
	| "Eb"
	| "E"
	| "F"
	| "F#"
	| "Gb"
	| "G"
	| "G#"
	| "Ab"
	| "A"
	| "A#"
	| "Bb"
	| "B";

export type ScaleMode = "major" | "minor";

/** Canonical chromatic scale using sharps. Index = semitone (0=C … 11=B). */
export const SHARPS: NoteName[] = [
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
];

/** Flat spellings for semitones that have two names. */
export const FLATS: NoteName[] = [
	"C",
	"Db",
	"D",
	"Eb",
	"E",
	"F",
	"Gb",
	"G",
	"Ab",
	"A",
	"Bb",
	"B",
];

/** Map any note name to its semitone number (0–11). */
export function noteToSemitone(note: NoteName): number {
	const idx = SHARPS.indexOf(note);
	if (idx !== -1) return idx;
	return FLATS.indexOf(note);
}

/**
 * Whether a key uses flat spelling, per the circle of fifths key signature.
 * Keys with >= 1 flat use flats; keys with >= 1 sharp (or C) use sharps.
 * Minor keys resolve to their relative major's convention.
 */
const KEY_USES_FLATS: Partial<Record<NoteName, boolean>> = {
	// Sharp / neutral major keys
	C: false,
	G: false,
	D: false,
	A: false,
	E: false,
	B: false,
	"F#": false,
	"C#": false,
	// Flat major keys
	F: true,
	Bb: true,
	Eb: true,
	Ab: true,
	Db: true,
	Gb: true,
};

function keyUsesFlats(key: NoteName): boolean {
	return KEY_USES_FLATS[key] ?? false;
}

/**
 * Spell a semitone (0–11) in the correct enharmonic form for the given key.
 * e.g. semitone 10 in F major → 'Bb'; same semitone in G major → 'A#'.
 *
 * For minor keys, pass the relative major key to get correct spelling,
 * OR pass the minor root — the function will default to sharps for
 * unrecognised roots (covers A, E, B minor which are sharp keys).
 */
export function spellNote(semitone: number, key: NoteName): NoteName {
	const s = ((semitone % 12) + 12) % 12;
	return keyUsesFlats(key) ? FLATS[s] : SHARPS[s];
}

/** All 12 chromatic notes as preferred by a given key's spelling convention. */
export function chromaticInKey(key: NoteName): NoteName[] {
	return Array.from({ length: 12 }, (_, i) => spellNote(i, key));
}
