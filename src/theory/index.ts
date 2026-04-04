/**
 * index.ts — theory module barrel export
 * Import everything the rest of the app needs from here.
 */

// Beat slot manipulation
export type { ValidationResult } from "./beatSlots";
export {
	evenSplitSlots,
	insertChordAtTick,
	removeSlot,
	replaceChord,
	resizeBoundary,
	singleChordSlots,
	validateSlots,
} from "./beatSlots";
// Chords
export type { Chord, ChordQuality } from "./chords";
export {
	chordLabel,
	chordNoteNames,
	chordToMidi,
	numeralLabel,
	QUALITY_INTERVALS,
	QUALITY_NUMERAL_CASE,
	QUALITY_SUFFIX,
} from "./chords";
// Data model
export type {
	Bar,
	BeatSlot,
	DrumPattern,
	DrumPatternId,
	Part,
	Section,
	SectionName,
	Song,
	Tick,
	TimeSignature,
} from "./model";
export { snapTick, ticksPerBar } from "./model";

// Nashville
export type { DiаtonicButton, NashvilleContext } from "./nashville";
export {
	buildDiatonicGrid,
	chordToNashville,
	nashvilleToChord,
	variantsForDegree,
} from "./nashville";
// Primitives
export type { NoteName, ScaleMode } from "./notes";
export {
	chromaticInKey,
	FLATS,
	noteToSemitone,
	SHARPS,
	spellNote,
} from "./notes";
// Scales
export type { NashvilleNumeral } from "./scales";
export {
	buildScale,
	NATURAL_QUALITIES,
	naturalQuality,
	noteToNumeral,
	numeralToNote,
	SCALE_INTERVALS,
} from "./scales";
// Song factory
export type { NewSongOptions } from "./songFactory";
export {
	createBar,
	createEmptyBar,
	createPart,
	createSection,
	createSong,
	resolvedrumPatternId,
} from "./songFactory";
// Transposition
export { keyDelta, transposeChord, transposeKey } from "./transposition";
