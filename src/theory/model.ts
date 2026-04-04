/**
 * model.ts
 * Canonical data model for Music Sketcher.
 *
 * Hierarchy:
 *   Song → Section[] → Part[] → Bar[] → BeatSlot[]
 *
 * Rhythm (drum pattern) cascades: Song → Section → Part → Bar.
 * Each level may override the level above; undefined = inherit.
 */
import { type Chord } from "./chords";
import { type NoteName, type ScaleMode } from "./notes";

// ─── Time ───────────────────────────────────────────────────────────────────

export interface TimeSignature {
	/** Beats per bar, e.g. 4 for 4/4, 3 for 3/4, 6 for 6/8. */
	numerator: number;
	/** Beat unit: 4 = quarter note, 8 = eighth note. */
	denominator: number;
}

/**
 * A rhythmic position within a bar, expressed in 16th-note ticks.
 * Tick 0 = bar start. In 4/4, one bar = 16 ticks.
 * The denominator determines how many 16th notes are in one beat unit:
 *   - 4/4: 1 beat = 4 ticks (quarter note)
 *   - 6/8: 1 beat = 2 ticks (eighth note)
 */
export type Tick = number;

/** How many 16th-note ticks are in one bar for a given time signature. */
export function ticksPerBar(ts: TimeSignature): number {
	// 16th notes per beat unit = 16 / denominator
	// Total ticks = beats * (16 / denominator)
	return ts.numerator * Math.floor(16 / ts.denominator);
}

/** Snap a tick value to the nearest division (4 = quarter, 2 = eighth, 1 = 16th). */
export function snapTick(tick: Tick, snapTo: 4 | 2 | 1 = 4): Tick {
	return Math.round(tick / snapTo) * snapTo;
}

// ─── Drum pattern ────────────────────────────────────────────────────────────

/**
 * A drum pattern reference. Patterns are stored in a separate library;
 * the song model only references them by id.
 * null = no drums.
 */
export type DrumPatternId = string | null;

// ─── Beat slot ───────────────────────────────────────────────────────────────

/**
 * A chord occupying a rhythmic position within a bar.
 *
 * startTick: 16th-note offset from bar start (0-based).
 * durationTicks: how many 16th-note ticks this chord lasts.
 *
 * Invariant: all slots within a bar must be non-overlapping and together
 * cover exactly ticksPerBar(song.timeSignature) ticks.
 *
 * Default even-split: the engine sets startTick and durationTicks
 * automatically when chords are added. Users can drag to override.
 */
export interface BeatSlot {
	chord: Chord;
	startTick: Tick; // 0 = bar start
	durationTicks: number; // must be ≥ 1
}

// ─── Bar ─────────────────────────────────────────────────────────────────────

export interface Bar {
	id: string;
	slots: BeatSlot[];
	lyric?: string; // optional lyric segment for this bar
	drumPatternId?: DrumPatternId; // undefined = inherit from Part/Section/Song
}

// ─── Part ─────────────────────────────────────────────────────────────────────

export interface Part {
	id: string;
	bars: Bar[];
	repeatCount: number; // 1 = play once, 2 = play twice, etc.
	drumPatternId?: DrumPatternId; // undefined = inherit from Section/Song
}

// ─── Section ──────────────────────────────────────────────────────────────────

export type SectionName =
	| "Intro"
	| "Verse"
	| "Verse 1"
	| "Verse 2"
	| "Chorus"
	| "Bridge"
	| "Interlude"
	| "Outro"
	| string; // allow custom names

export interface Section {
	id: string;
	name: SectionName;
	parts: Part[];
	drumPatternId?: DrumPatternId; // undefined = inherit from Song
}

// ─── Song ─────────────────────────────────────────────────────────────────────

export interface Song {
	id: string;
	title: string; // default: "Song N"

	// Music theory context
	key: NoteName;
	mode: ScaleMode;
	timeSignature: TimeSignature;
	bpm: number;

	// Instrument settings
	instrument: "guitar" | "piano";
	capo: number; // fret number 0–7; purely a voicing hint, no pitch effect

	// Drum pattern (inherited by all sections/parts/bars unless overridden)
	drumPatternId: DrumPatternId;

	// Structure
	sections: Section[];

	// Persistence metadata
	createdAt: number; // epoch ms
	updatedAt: number; // epoch ms
}

// ─── Drum pattern library entry ───────────────────────────────────────────────

export interface DrumPattern {
	id: string;
	name: string; // e.g. '4-on-the-floor', 'Jazz 16ths', 'Waltz'
	timeSignature: TimeSignature;
	strudel: string; // e.g. 'bd ~ ~ ~, ~ sn ~ sn, hh hh hh hh'
}
