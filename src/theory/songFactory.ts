/**
 * songFactory.ts
 * Factory functions for creating new Song, Section, Part, and Bar instances
 * with correct defaults. All IDs are generated here.
 *
 * Uses crypto.randomUUID() — available in all modern browsers and Node 18+.
 */

import { evenSplitSlots, singleChordSlots } from "./beatSlots";
import { type Chord } from "./chords";
import {
	type Bar,
	type BeatSlot,
	type DrumPatternId,
	type Part,
	type Section,
	type Song,
	type TimeSignature,
} from "./model";
import { type NoteName, type ScaleMode } from "./notes";

function uid(): string {
	return crypto.randomUUID();
}

// ─── Bar ─────────────────────────────────────────────────────────────────────

export function createBar(
	chords: Chord[],
	ts: TimeSignature,
	lyric?: string,
): Bar {
	const slots: BeatSlot[] =
		chords.length === 0
			? [] // caller must add at least one chord before bar is valid
			: chords.length === 1
				? singleChordSlots(chords[0], ts)
				: evenSplitSlots(chords, ts);

	return {
		id: uid(),
		slots,
		lyric,
	};
}

/**
 * Create an empty bar placeholder (for the "+" button in the score).
 * Must be populated with at least one chord before playback.
 */
export function createEmptyBar(): Bar {
	return { id: uid(), slots: [] };
}

// ─── Part ─────────────────────────────────────────────────────────────────────

export function createPart(bars: Bar[] = [], repeatCount = 1): Part {
	return {
		id: uid(),
		bars,
		repeatCount,
	};
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function createSection(name: string, parts: Part[] = []): Section {
	return {
		id: uid(),
		name,
		parts,
	};
}

// ─── Song ─────────────────────────────────────────────────────────────────────

export interface NewSongOptions {
	title?: string;
	key?: NoteName;
	mode?: ScaleMode;
	timeSignature?: TimeSignature;
	bpm?: number;
	instrument?: "guitar" | "piano";
	capo?: number;
	drumPatternId?: DrumPatternId;
}

const DEFAULT_TS: TimeSignature = { numerator: 4, denominator: 4 };

export function createSong(
	titleIndex: number,
	options: NewSongOptions = {},
): Song {
	const now = Date.now();
	const defaultTitle = `Song ${titleIndex}`;

	return {
		id: uid(),
		title: options.title ?? defaultTitle,
		key: options.key ?? "C",
		mode: options.mode ?? "major",
		timeSignature: options.timeSignature ?? DEFAULT_TS,
		bpm: options.bpm ?? 120,
		instrument: options.instrument ?? "guitar",
		capo: options.capo ?? 0,
		drumPatternId: options.drumPatternId ?? null,
		sections: [],
		createdAt: now,
		updatedAt: now,
	};
}

// ─── Rhythm inheritance ───────────────────────────────────────────────────────

/**
 * Resolve the effective drum pattern for a bar, walking up the hierarchy.
 * Returns the first non-undefined drumPatternId found.
 */
export function resolvedrumPatternId(
	bar: Bar,
	part: Part,
	section: Section,
	song: Song,
): DrumPatternId {
	if (bar.drumPatternId !== undefined) return bar.drumPatternId;
	if (part.drumPatternId !== undefined) return part.drumPatternId;
	if (section.drumPatternId !== undefined) return section.drumPatternId;
	return song.drumPatternId;
}
