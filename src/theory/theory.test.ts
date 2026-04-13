/**
 * theory.test.ts
 * Unit tests for the music theory engine.
 * Run with: npx vitest run (or jest if preferred)
 */

import { describe, expect, it } from "vitest";
import {
	evenSplitSlots,
	insertChordAtTick,
	removeSlot,
	replaceChord,
	resizeBoundary,
	singleChordSlots,
	snapTick,
	ticksPerBar,
	validateSlots,
} from "./beatSlots";
import {
	chordLabel,
	chordToMidi,
	numeralLabel,
	QUALITY_INTERVALS,
} from "./chords";
import {
	buildDiatonicGrid,
	chordToNashville,
	nashvilleToChord,
} from "./nashville";
import { chromaticInKey, noteToSemitone, spellNote } from "./notes";
import {
	buildScale,
	naturalQuality,
	noteToNumeral,
	numeralToNote,
} from "./scales";
import {
	createBar,
	createPart,
	createSection,
	createSong,
	resolvedrumPatternId,
} from "./songFactory";
import { keyDelta, transposeChord, transposeKey } from "./transposition";

// ─── Notes ───────────────────────────────────────────────────────────────────

describe("noteToSemitone", () => {
	it("maps C to 0", () => expect(noteToSemitone("C")).toBe(0));
	it("maps B to 11", () => expect(noteToSemitone("B")).toBe(11));
	it("maps C# and Db to 1", () => {
		expect(noteToSemitone("C#")).toBe(1);
		expect(noteToSemitone("Db")).toBe(1);
	});
	it("maps F# and Gb to 6", () => {
		expect(noteToSemitone("F#")).toBe(6);
		expect(noteToSemitone("Gb")).toBe(6);
	});
});

describe("spellNote", () => {
	it("uses sharps in G major", () => {
		expect(spellNote(6, "G")).toBe("F#"); // semitone 6 = F#/Gb
		expect(spellNote(1, "G")).toBe("C#");
	});
	it("uses flats in F major", () => {
		expect(spellNote(10, "F")).toBe("Bb"); // semitone 10 = A#/Bb
		expect(spellNote(1, "F")).toBe("Db");
	});
	it("uses flats in Bb major", () => {
		expect(spellNote(10, "Bb")).toBe("Bb");
		expect(spellNote(3, "Bb")).toBe("Eb");
	});
});

describe("chromaticInKey", () => {
	it("returns 12 notes for C major (all naturals)", () => {
		const chromatic = chromaticInKey("C");
		expect(chromatic).toHaveLength(12);
		expect(chromatic[0]).toBe("C");
		expect(chromatic[6]).toBe("F#"); // C major prefers sharps
	});
});

// ─── Scales ──────────────────────────────────────────────────────────────────

describe("buildScale", () => {
	it("builds C major correctly", () => {
		expect(buildScale("C", "major")).toEqual([
			"C",
			"D",
			"E",
			"F",
			"G",
			"A",
			"B",
		]);
	});
	it("builds G major correctly (one sharp)", () => {
		expect(buildScale("G", "major")).toEqual([
			"G",
			"A",
			"B",
			"C",
			"D",
			"E",
			"F#",
		]);
	});
	it("builds F major correctly (one flat)", () => {
		expect(buildScale("F", "major")).toEqual([
			"F",
			"G",
			"A",
			"Bb",
			"C",
			"D",
			"E",
		]);
	});
	it("builds A minor correctly", () => {
		expect(buildScale("A", "minor")).toEqual([
			"A",
			"B",
			"C",
			"D",
			"E",
			"F",
			"G",
		]);
	});
	it("builds E minor correctly", () => {
		expect(buildScale("E", "minor")).toEqual([
			"E",
			"F#",
			"G",
			"A",
			"B",
			"C",
			"D",
		]);
	});
	it("builds D major correctly (two sharps)", () => {
		expect(buildScale("D", "major")).toEqual([
			"D",
			"E",
			"F#",
			"G",
			"A",
			"B",
			"C#",
		]);
	});
	it("builds Bb major correctly (two flats)", () => {
		expect(buildScale("Bb", "major")).toEqual([
			"Bb",
			"C",
			"D",
			"Eb",
			"F",
			"G",
			"A",
		]);
	});
});

describe("naturalQuality", () => {
	it("I in major = maj", () => expect(naturalQuality(1, "major")).toBe("maj"));
	it("ii in major = min", () => expect(naturalQuality(2, "major")).toBe("min"));
	it("V in major = maj", () => expect(naturalQuality(5, "major")).toBe("maj"));
	it("vii in major = dim", () =>
		expect(naturalQuality(7, "major")).toBe("dim"));
	it("i in minor = min", () => expect(naturalQuality(1, "minor")).toBe("min"));
	it("III in minor = maj", () =>
		expect(naturalQuality(3, "minor")).toBe("maj"));
});

describe("noteToNumeral", () => {
	it("C is I in C major", () =>
		expect(noteToNumeral("C", "C", "major")).toBe(1));
	it("G is V in C major", () =>
		expect(noteToNumeral("G", "C", "major")).toBe(5));
	it("F# is null in C major (out of scale)", () =>
		expect(noteToNumeral("F#", "C", "major")).toBeNull());
	it("E is III in C minor", () =>
		expect(noteToNumeral("Eb", "C", "minor")).toBe(3));
});

// ─── Chords ──────────────────────────────────────────────────────────────────

describe("chordToMidi", () => {
	it("C major triad has correct MIDI notes", () => {
		// C4=60, E4=64, G4=67
		expect(chordToMidi({ root: "C", quality: "maj" }, 4)).toEqual([60, 64, 67]);
	});
	it("G dominant 7th has correct MIDI notes", () => {
		// G4=67, B4=71, D5=74, F5=77
		expect(chordToMidi({ root: "G", quality: "dom7" }, 4)).toEqual([
			67, 71, 74, 77,
		]);
	});
	it("Am chord has correct MIDI notes", () => {
		// A4=69, C5=72, E5=76
		expect(chordToMidi({ root: "A", quality: "min" }, 4)).toEqual([69, 72, 76]);
	});
});

describe("chordLabel", () => {
	it("major has no suffix", () =>
		expect(chordLabel({ root: "C", quality: "maj" })).toBe("C"));
	it("minor has m suffix", () =>
		expect(chordLabel({ root: "A", quality: "min" })).toBe("Am"));
	it("dom7 has 7 suffix", () =>
		expect(chordLabel({ root: "G", quality: "dom7" })).toBe("G7"));
	it("maj7 has maj7 suffix", () =>
		expect(chordLabel({ root: "C", quality: "maj7" })).toBe("Cmaj7"));
	it("dim has ° suffix", () =>
		expect(chordLabel({ root: "B", quality: "dim" })).toBe("B°"));
});

describe("numeralLabel", () => {
	it("I major = I", () => expect(numeralLabel(1, "maj")).toBe("I"));
	it("6 minor = vi", () => expect(numeralLabel(6, "min")).toBe("vi"));
	it("5 dom7 = V7", () => expect(numeralLabel(5, "dom7")).toBe("V7"));
	it("4 sus4 = IVsus4", () => expect(numeralLabel(4, "sus4")).toBe("IVsus4"));
	it("bVII major = bVII", () =>
		expect(numeralLabel(7, "maj", "b")).toBe("bVII"));
});

// ─── Nashville ───────────────────────────────────────────────────────────────

describe("nashvilleToChord", () => {
	it("IV in G major = C", () => {
		const chord = nashvilleToChord(4, "G", "major");
		expect(chord).toEqual({ root: "C", quality: "maj" });
	});
	it("V in G major = D maj", () => {
		const chord = nashvilleToChord(5, "G", "major");
		expect(chord).toEqual({ root: "D", quality: "maj" });
	});
	it("ii in D major = Em", () => {
		const chord = nashvilleToChord(2, "D", "major");
		expect(chord).toEqual({ root: "E", quality: "min" });
	});
	it("quality override works", () => {
		const chord = nashvilleToChord(4, "C", "major", "sus4");
		expect(chord).toEqual({ root: "F", quality: "sus4" });
	});
});

describe("buildDiatonicGrid", () => {
	it("C major grid has 7 chords", () => {
		const grid = buildDiatonicGrid("C", "major");
		expect(grid).toHaveLength(7);
	});
	it("C major grid: I=C, IV=F, V=G", () => {
		const grid = buildDiatonicGrid("C", "major");
		expect(grid[0].chordName).toBe("C");
		expect(grid[3].chordName).toBe("F");
		expect(grid[4].chordName).toBe("G");
	});
	it("C major grid numeral labels", () => {
		const grid = buildDiatonicGrid("C", "major");
		expect(grid[0].numeralLabel).toBe("I");
		expect(grid[1].numeralLabel).toBe("ii");
		expect(grid[4].numeralLabel).toBe("V");
	});
	it("A minor grid: i=Am, III=C, VII=G", () => {
		const grid = buildDiatonicGrid("A", "minor");
		expect(grid[0].chordName).toBe("Am");
		expect(grid[2].chordName).toBe("C");
		expect(grid[6].chordName).toBe("G");
	});
});

describe("chordToNashville", () => {
	it("F chord in C major = IV", () => {
		const ctx = chordToNashville({ root: "F", quality: "maj" }, "C", "major");
		expect(ctx.numeral).toBe(4);
		expect(ctx.label).toBe("IV");
	});
	it("out-of-key chord gets accidental", () => {
		// Bb in C major = bVII
		const ctx = chordToNashville({ root: "Bb", quality: "maj" }, "C", "major");
		expect(ctx.numeral).toBeNull();
		expect(ctx.accidental).toBe("b");
		expect(ctx.label).toBe("bVII");
	});
});

// ─── Transposition ───────────────────────────────────────────────────────────

describe("transposeChord", () => {
	it("transposes C up 2 semitones to D", () => {
		const result = transposeChord({ root: "C", quality: "maj" }, 2, "D");
		expect(result.root).toBe("D");
		expect(result.quality).toBe("maj");
	});
	it("transposes G down 5 semitones to D", () => {
		const result = transposeChord({ root: "G", quality: "dom7" }, -5, "D");
		expect(result.root).toBe("D");
		expect(result.quality).toBe("dom7");
	});
	it("wraps around the octave correctly", () => {
		const result = transposeChord({ root: "A", quality: "min" }, 4, "C#");
		expect(noteToSemitone(result.root)).toBe((noteToSemitone("A") + 4) % 12);
	});
});

describe("keyDelta", () => {
	it("C to G = +7 semitones... prefers -5", () => {
		// +7 vs -5: abs(-5) < abs(7), so prefer -5?
		// keyDelta returns the shorter path: 7 > 6, so 7-12 = -5
		expect(keyDelta("C", "G")).toBe(-5);
	});
	it("C to F = +5 semitones", () => {
		expect(keyDelta("C", "F")).toBe(5);
	});
	it("C to C = 0", () => {
		expect(keyDelta("C", "C")).toBe(0);
	});
	it("G to D = -5", () => {
		expect(keyDelta("G", "D")).toBe(-5);
	});
});

// ─── Beat slots ───────────────────────────────────────────────────────────────

const TS_4_4 = { numerator: 4, denominator: 4 };
const TS_3_4 = { numerator: 3, denominator: 4 };
const TS_6_8 = { numerator: 6, denominator: 8 };

const C = { root: "C" as const, quality: "maj" as const };
const G = { root: "G" as const, quality: "dom7" as const };
const Am = { root: "A" as const, quality: "min" as const };
const F = { root: "F" as const, quality: "maj" as const };

describe("ticksPerBar", () => {
	it("4/4 = 16 ticks", () => expect(ticksPerBar(TS_4_4)).toBe(16));
	it("3/4 = 12 ticks", () => expect(ticksPerBar(TS_3_4)).toBe(12));
	it("6/8 = 12 ticks", () => expect(ticksPerBar(TS_6_8)).toBe(12));
});

describe("snapTick", () => {
	it("snaps to nearest quarter (4)", () => {
		expect(snapTick(5, 4)).toBe(4);
		expect(snapTick(7, 4)).toBe(8);
	});
	it("snaps to nearest eighth (2)", () => {
		expect(snapTick(3, 2)).toBe(4);
		expect(snapTick(1, 2)).toBe(2);
	});
});

describe("singleChordSlots", () => {
	it("fills the whole bar", () => {
		const slots = singleChordSlots(C, TS_4_4);
		expect(slots).toHaveLength(1);
		expect(slots[0].startTick).toBe(0);
		expect(slots[0].durationTicks).toBe(16);
	});
});

describe("evenSplitSlots", () => {
	it("splits 2 chords evenly in 4/4", () => {
		const slots = evenSplitSlots([C, G], TS_4_4);
		expect(slots).toHaveLength(2);
		expect(slots[0].durationTicks).toBe(8);
		expect(slots[1].startTick).toBe(8);
		expect(slots[1].durationTicks).toBe(8);
	});
	it("splits 4 chords evenly in 4/4", () => {
		const slots = evenSplitSlots([C, Am, F, G], TS_4_4);
		expect(slots.every((s) => s.durationTicks === 4)).toBe(true);
	});
	it("absorbs remainder into last chord for 3 chords in 4/4", () => {
		// 16 / 3 = 5 remainder 1 → [5, 5, 6]
		const slots = evenSplitSlots([C, G, Am], TS_4_4);
		expect(slots[0].durationTicks).toBe(5);
		expect(slots[1].durationTicks).toBe(5);
		expect(slots[2].durationTicks).toBe(6);
		expect(slots[2].startTick).toBe(10);
	});
	it("total always equals ticksPerBar", () => {
		const slots = evenSplitSlots([C, G, Am], TS_4_4);
		const total = slots.reduce((sum, s) => sum + s.durationTicks, 0);
		expect(total).toBe(ticksPerBar(TS_4_4));
	});
});

describe("validateSlots", () => {
	it("validates correct slots", () => {
		const slots = evenSplitSlots([C, G], TS_4_4);
		expect(validateSlots(slots, TS_4_4).valid).toBe(true);
	});
	it("rejects slots with wrong total", () => {
		const slots = [{ chord: C, startTick: 0, durationTicks: 10 }];
		expect(validateSlots(slots, TS_4_4).valid).toBe(false);
	});
	it("rejects empty bar", () => {
		expect(validateSlots([], TS_4_4).valid).toBe(false);
	});
});

describe("removeSlot", () => {
	it("removes a slot and merges into previous", () => {
		const slots = evenSplitSlots([C, G, Am], TS_4_4);
		const result = removeSlot(slots, 1); // remove G
		expect(result).toHaveLength(2);
		expect(result[0].durationTicks).toBe(
			slots[0].durationTicks + slots[1].durationTicks,
		);
		expect(validateSlots(result, TS_4_4).valid).toBe(true);
	});
	it("removes first slot and merges into next", () => {
		const slots = evenSplitSlots([C, G], TS_4_4);
		const result = removeSlot(slots, 0);
		expect(result).toHaveLength(1);
		expect(result[0].chord).toEqual(G);
		expect(result[0].durationTicks).toBe(16);
	});
	it("does not remove last remaining slot", () => {
		const slots = singleChordSlots(C, TS_4_4);
		expect(removeSlot(slots, 0)).toHaveLength(1);
	});
});

describe("resizeBoundary", () => {
	it("moves boundary between two slots", () => {
		const slots = evenSplitSlots([C, G], TS_4_4); // [0-8, 8-16]
		const result = resizeBoundary(slots, 0, 12, 4); // move boundary to tick 12
		expect(result[0].durationTicks).toBe(12);
		expect(result[1].startTick).toBe(12);
		expect(result[1].durationTicks).toBe(4);
		expect(validateSlots(result, TS_4_4).valid).toBe(true);
	});
	it("clamps to prevent zero-duration slots", () => {
		const slots = evenSplitSlots([C, G], TS_4_4);
		const result = resizeBoundary(slots, 0, 0, 1); // try to collapse first slot
		expect(result[0].durationTicks).toBeGreaterThan(0);
		expect(result[1].durationTicks).toBeGreaterThan(0);
	});
});

describe("insertChordAtTick", () => {
	it("inserts a chord splitting an existing slot", () => {
		const slots = singleChordSlots(C, TS_4_4); // [C: 0-16]
		const result = insertChordAtTick(slots, G, 8, TS_4_4); // insert G at tick 8
		expect(result).toHaveLength(2);
		expect(result[0].chord).toEqual(C);
		expect(result[0].durationTicks).toBe(8);
		expect(result[1].chord).toEqual(G);
		expect(result[1].startTick).toBe(8);
		expect(validateSlots(result, TS_4_4).valid).toBe(true);
	});
});

describe("replaceChord", () => {
	it("replaces chord without changing timing", () => {
		const slots = evenSplitSlots([C, G], TS_4_4);
		const result = replaceChord(slots, 0, Am);
		expect(result[0].chord).toEqual(Am);
		expect(result[0].startTick).toBe(0);
		expect(result[0].durationTicks).toBe(8);
		expect(result[1]).toEqual(slots[1]); // unchanged
	});
});

// ─── Song factory ─────────────────────────────────────────────────────────────

describe("createSong", () => {
	it("creates a song with default title", () => {
		const song = createSong(3);
		expect(song.title).toBe("Song 3");
		expect(song.key).toBe("C");
		expect(song.bpm).toBe(120);
		expect(song.sections).toEqual([]);
	});
	it("overrides defaults", () => {
		const song = createSong(1, { key: "G", bpm: 140, mode: "minor" });
		expect(song.key).toBe("G");
		expect(song.bpm).toBe(140);
		expect(song.mode).toBe("minor");
	});
	it("generates unique IDs", () => {
		const a = createSong(1);
		const b = createSong(2);
		expect(a.id).not.toBe(b.id);
	});
});

describe("resolvedrumPatternId", () => {
	it("bar override wins", () => {
		const song = createSong(1, { drumPatternId: "song-pattern" });
		const section = createSection("Verse");
		const part = createPart();
		const bar = createBar([C], TS_4_4);
		bar.drumPatternId = "bar-pattern";
		expect(resolvedrumPatternId(bar, part, section, song)).toBe("bar-pattern");
	});
	it("falls through to song if nothing overrides", () => {
		const song = createSong(1, { drumPatternId: "song-pattern" });
		const section = createSection("Verse");
		const part = createPart();
		const bar = createBar([C], TS_4_4);
		expect(resolvedrumPatternId(bar, part, section, song)).toBe("song-pattern");
	});
	it("returns null if nothing set", () => {
		const song = createSong(1);
		const section = createSection("Verse");
		const part = createPart();
		const bar = createBar([C], TS_4_4);
		expect(resolvedrumPatternId(bar, part, section, song)).toBeNull();
	});
});
