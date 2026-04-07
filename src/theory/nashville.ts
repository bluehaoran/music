/**
 * nashville.ts
 * Bidirectional conversion between Nashville numerals and resolved chords.
 * This is the primary interface the UI uses to build the chord input grid.
 */

import {
	type Chord,
	type ChordQuality,
	chordLabel,
	numeralLabel,
	QUALITY_SUFFIX,
} from "./chords";
import { type NoteName, noteToSemitone, type ScaleMode } from "./notes";
import {
	buildScale,
	type NashvilleNumeral,
	naturalQuality,
	noteToNumeral,
	numeralToNote,
} from "./scales";

// ─── Core resolution ────────────────────────────────────────────────────────

/**
 * Resolve a Nashville numeral to a Chord in the given key.
 * The quality defaults to the natural diatonic quality for that degree,
 * but can be overridden (e.g. baking in a sus4 variant).
 */
export function nashvilleToChord(
	numeral: NashvilleNumeral,
	key: NoteName,
	mode: ScaleMode,
	qualityOverride?: ChordQuality,
): Chord {
	const root = numeralToNote(numeral, key, mode);
	const quality = qualityOverride ?? naturalQuality(numeral, mode);
	return { root, quality };
}

/**
 * Given a Chord, determine its Nashville numeral context in a key.
 * Returns null for the numeral if the chord root is outside the diatonic scale
 * (out-of-key chord), but still returns an accidental and closest numeral.
 */
export interface NashvilleContext {
	numeral: NashvilleNumeral | null; // null = out of key
	quality: ChordQuality;
	accidental: "" | "b" | "#";
	label: string; // full formatted label, e.g. "bVII7" or "IV"
	resolvedName: string; // chord name in key spelling, e.g. "Bb7"
}

export function chordToNashville(
	chord: Chord,
	key: NoteName,
	mode: ScaleMode,
): NashvilleContext {
	const scale = buildScale(key, mode);
	const inKeyNumeral = noteToNumeral(chord.root, key, mode);

	if (inKeyNumeral !== null) {
		// Chord root is in the scale
		const label = numeralLabel(inKeyNumeral, chord.quality, "");
		return {
			numeral: inKeyNumeral,
			quality: chord.quality,
			accidental: "",
			label,
			resolvedName: chordLabel(chord),
		};
	}

	// Out-of-key chord: find nearest diatonic degree and compute accidental
	const rootSemitone = noteToSemitone(chord.root);

	let closestNumeral: NashvilleNumeral = 1;
	let accidental: "" | "b" | "#" = "b";

	// Prefer flat interpretation (bVII is more common than #VI etc.)
	// Check flat first: is rootSemitone+1 a scale degree?
	for (let i = 0; i < scale.length; i++) {
		const degSemitone = noteToSemitone(scale[i]);
		if ((degSemitone - 1 + 12) % 12 === rootSemitone % 12) {
			closestNumeral = (i + 1) as NashvilleNumeral;
			accidental = "b";
			break;
		}
	}
	// Then sharp: is rootSemitone-1 a scale degree?
	if (accidental === "b") {
		// Verify it wasn't actually found as flat
		const flatFound = scale.some(
			(note) => (noteToSemitone(note) - 1 + 12) % 12 === rootSemitone % 12,
		);
		if (!flatFound) {
			for (let i = 0; i < scale.length; i++) {
				const degSemitone = noteToSemitone(scale[i]);
				if ((degSemitone + 1) % 12 === rootSemitone % 12) {
					closestNumeral = (i + 1) as NashvilleNumeral;
					accidental = "#";
					break;
				}
			}
		}
	}

	const label = numeralLabel(closestNumeral, chord.quality, accidental);
	return {
		numeral: null,
		quality: chord.quality,
		accidental,
		label,
		resolvedName: chordLabel(chord),
	};
}

// ─── UI grid data ───────────────────────────────────────────────────────────

/**
 * Build the 7 diatonic chord buttons for the chord input grid.
 * Each entry has the resolved chord, its numeral label, and its chord name.
 */
export interface DiаtonicButton {
	numeral: NashvilleNumeral;
	chord: Chord;
	numeralLabel: string; // e.g. "IV", "vi", "V7"
	chordName: string; // e.g. "F", "Am", "G7"
}

export function buildDiatonicGrid(
	key: NoteName,
	mode: ScaleMode,
): DiаtonicButton[] {
	return ([1, 2, 3, 4, 5, 6, 7] as NashvilleNumeral[]).map((numeral) => {
		const chord = nashvilleToChord(numeral, key, mode);
		return {
			numeral,
			chord,
			numeralLabel: numeralLabel(numeral, chord.quality, ""),
			chordName: chordLabel(chord),
		};
	});
}

/**
 * Available quality variants for the long-press popover on a given degree.
 * Returns the natural quality first, then useful alternatives.
 */
export function variantsForDegree(
	numeral: NashvilleNumeral,
	key: NoteName,
	mode: ScaleMode,
): Array<{ quality: ChordQuality; chord: Chord; label: string }> {
	const root = numeralToNote(numeral, key, mode);
	const natural = naturalQuality(numeral, mode);

	// Variants that make musical sense on any degree.
	// For major V, dom7 is the functional dominant — promote it to 2nd position.
	const secondaries: ChordQuality[] =
		numeral === 5 && mode === "major"
			? ["dom7", "maj", "min", "maj7", "min7", "sus2", "sus4", "add9", "dim", "aug"]
			: ["maj", "min", "dom7", "maj7", "min7", "sus2", "sus4", "add9", "dim", "aug"];
	const candidates: ChordQuality[] = [natural, ...secondaries];

	// Deduplicate while preserving order
	const seen = new Set<ChordQuality>();
	const variants: ChordQuality[] = [];
	for (const q of candidates) {
		if (!seen.has(q)) {
			seen.add(q);
			variants.push(q);
		}
	}

	return variants.map((quality) => ({
		quality,
		chord: { root, quality },
		label: `${root}${QUALITY_SUFFIX[quality]}` || root,
	}));
}
