/**
 * transposition.ts
 * Transpose chords and songs by semitone intervals.
 * Capo is NOT handled here — it lives in the audio/voicing layer only.
 */

import { type Chord } from "./chords";
import { type NoteName, noteToSemitone, spellNote } from "./notes";

/**
 * Transpose a single chord by n semitones.
 * The new root is spelled correctly for the target key context.
 *
 * @param chord       The chord to transpose
 * @param semitones   Positive = up, negative = down
 * @param targetKey   The key to use for enharmonic spelling of the result.
 *                    If omitted, sharps are used as default.
 */
export function transposeChord(
	chord: Chord,
	semitones: number,
	targetKey?: NoteName,
): Chord {
	const rootSemitone = noteToSemitone(chord.root);
	const newSemitone = (((rootSemitone + semitones) % 12) + 12) % 12;
	const newRoot = spellNote(newSemitone, targetKey ?? chord.root);
	return { ...chord, root: newRoot };
}

/**
 * Transpose a key root by n semitones (for re-keying a whole song).
 */
export function transposeKey(key: NoteName, semitones: number): NoteName {
	const s = noteToSemitone(key);
	const newS = (((s + semitones) % 12) + 12) % 12;
	return spellNote(newS, key); // approximate — the new key will re-spell itself
}

/**
 * Given a source key and a target key, compute the semitone delta.
 * Useful for "change song key from D to F".
 */
export function keyDelta(fromKey: NoteName, toKey: NoteName): number {
	const delta = (noteToSemitone(toKey) - noteToSemitone(fromKey) + 12) % 12;
	// Prefer the shorter path (e.g. +5 vs -7)
	return delta > 6 ? delta - 12 : delta;
}
