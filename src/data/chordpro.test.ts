/**
 * chordpro.test.ts
 * Tests for ChordPro export and import.
 */

import { describe, expect, it } from "vitest";
import { exportChordPro, importChordPro } from "./chordpro";
import type { Song } from "../theory/model";
import { createBar, createPart, createSection } from "../theory/songFactory";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSong(overrides: Partial<Song> = {}): Song {
	return {
		id: "s1",
		title: "Test Song",
		key: "C",
		mode: "major",
		timeSignature: { numerator: 4, denominator: 4 },
		bpm: 120,
		instrument: "guitar",
		capo: 0,
		drumPatternId: null,
		sections: [],
		createdAt: 0,
		updatedAt: 0,
		...overrides,
	};
}

// ─── Export ──────────────────────────────────────────────────────────────────

describe("exportChordPro", () => {
	it("exports metadata directives", () => {
		const song = makeSong({
			title: "My Song",
			key: "G",
			mode: "minor",
			bpm: 90,
		});
		const out = exportChordPro(song);
		expect(out).toContain("{title: My Song}");
		expect(out).toContain("{key: G minor}");
		expect(out).toContain("{tempo: 90}");
		expect(out).toContain("{time: 4/4}");
	});

	it("includes capo only when > 0", () => {
		expect(exportChordPro(makeSong({ capo: 0 }))).not.toContain("{capo:");
		expect(exportChordPro(makeSong({ capo: 3 }))).toContain("{capo: 3}");
	});

	it("exports sections with start/end tags", () => {
		const ts = { numerator: 4, denominator: 4 };
		const bar = createBar([{ root: "C", quality: "maj" }], ts);
		const song = makeSong({
			sections: [createSection("Verse", [createPart([bar])])],
		});
		const out = exportChordPro(song);
		expect(out).toContain("{start_of_verse: Verse}");
		expect(out).toContain("{end_of_verse}");
		expect(out).toContain("[C]");
	});

	it("exports chorus sections with chorus tag", () => {
		const ts = { numerator: 4, denominator: 4 };
		const bar = createBar([{ root: "A", quality: "min" }], ts);
		const song = makeSong({
			sections: [createSection("Chorus", [createPart([bar])])],
		});
		const out = exportChordPro(song);
		expect(out).toContain("{start_of_chorus: Chorus}");
		expect(out).toContain("{end_of_chorus}");
		expect(out).toContain("[Am]");
	});

	it("exports repeat counts as comments", () => {
		const ts = { numerator: 4, denominator: 4 };
		const bar = createBar([{ root: "D", quality: "maj" }], ts);
		const song = makeSong({
			sections: [createSection("Verse", [createPart([bar], 3)])],
		});
		const out = exportChordPro(song);
		expect(out).toContain("{comment: x3}");
	});

	it("exports chord qualities correctly", () => {
		const ts = { numerator: 4, denominator: 4 };
		const chords: Array<{ root: string; quality: string; expected: string }> = [
			{ root: "C", quality: "maj", expected: "[C]" },
			{ root: "A", quality: "min", expected: "[Am]" },
			{ root: "G", quality: "dom7", expected: "[G7]" },
			{ root: "F", quality: "maj7", expected: "[Fmaj7]" },
			{ root: "E", quality: "min7", expected: "[Em7]" },
			{ root: "B", quality: "dim", expected: "[Bdim]" },
			{ root: "C", quality: "aug", expected: "[C+]" },
			{ root: "D", quality: "sus4", expected: "[Dsus4]" },
			{ root: "D", quality: "sus2", expected: "[Dsus2]" },
			{ root: "C", quality: "add9", expected: "[Cadd9]" },
			{ root: "B", quality: "min7b5", expected: "[Bm7b5]" },
		];
		for (const { root, quality, expected } of chords) {
			const bar = createBar([{ root, quality } as any], ts);
			const song = makeSong({
				sections: [createSection("Verse", [createPart([bar])])],
			});
			const out = exportChordPro(song);
			expect(out).toContain(expected);
		}
	});

	it("exports lyrics alongside chords", () => {
		const ts = { numerator: 4, denominator: 4 };
		const bar = createBar([{ root: "C", quality: "maj" }], ts, "hello");
		const song = makeSong({
			sections: [createSection("Verse", [createPart([bar])])],
		});
		const out = exportChordPro(song);
		expect(out).toContain("[C]hello");
	});

	it("exports multi-chord bars with extra chord tags", () => {
		const ts = { numerator: 4, denominator: 4 };
		const bar = createBar(
			[
				{ root: "C", quality: "maj" },
				{ root: "G", quality: "maj" },
			],
			ts,
		);
		const song = makeSong({
			sections: [createSection("Verse", [createPart([bar])])],
		});
		const out = exportChordPro(song);
		expect(out).toContain("[C]");
		expect(out).toContain("[G]");
	});

	it("exports 6/8 time signature", () => {
		const song = makeSong({
			timeSignature: { numerator: 6, denominator: 8 },
		});
		const out = exportChordPro(song);
		expect(out).toContain("{time: 6/8}");
	});
});

// ─── Import ──────────────────────────────────────────────────────────────────

describe("importChordPro", () => {
	it("parses metadata directives", () => {
		const input = [
			"{title: My Song}",
			"{key: G minor}",
			"{tempo: 90}",
			"{time: 3/4}",
			"{capo: 2}",
		].join("\n");
		const result = importChordPro(input);
		expect(result.title).toBe("My Song");
		expect(result.key).toBe("G");
		expect(result.mode).toBe("minor");
		expect(result.bpm).toBe(90);
		expect(result.timeSignature).toEqual({ numerator: 3, denominator: 4 });
		expect(result.capo).toBe(2);
	});

	it("parses key shorthand (e.g. Am → A minor)", () => {
		const result = importChordPro("{key: Am}");
		expect(result.key).toBe("A");
		expect(result.mode).toBe("minor");
	});

	it("parses plain key (e.g. G → G major)", () => {
		const result = importChordPro("{key: G}");
		expect(result.key).toBe("G");
		expect(result.mode).toBe("major");
	});

	it("parses sections", () => {
		const input = [
			"{start_of_verse: Verse}",
			"[C] [G]",
			"{end_of_verse}",
			"{start_of_chorus: Chorus}",
			"[Am] [F]",
			"{end_of_chorus}",
		].join("\n");
		const result = importChordPro(input);
		expect(result.sections).toHaveLength(2);
		expect(result.sections[0].name).toBe("Verse");
		expect(result.sections[1].name).toBe("Chorus");
	});

	it("creates bars from chord tokens", () => {
		const input = [
			"{start_of_verse: Verse}",
			"[C] [G] [Am] [F]",
			"{end_of_verse}",
		].join("\n");
		const result = importChordPro(input);
		const bars = result.sections[0].parts[0].bars;
		expect(bars).toHaveLength(4);
		expect(bars[0].slots[0].chord).toEqual({ root: "C", quality: "maj" });
		expect(bars[1].slots[0].chord).toEqual({ root: "G", quality: "maj" });
		expect(bars[2].slots[0].chord).toEqual({ root: "A", quality: "min" });
		expect(bars[3].slots[0].chord).toEqual({ root: "F", quality: "maj" });
	});

	it("parses chord qualities", () => {
		const input = [
			"{start_of_verse: V}",
			"[Cmaj7] [Am7] [G7] [Bdim]",
			"{end_of_verse}",
		].join("\n");
		const result = importChordPro(input);
		const chords = result.sections[0].parts[0].bars.map(
			(b) => b.slots[0].chord,
		);
		expect(chords[0]).toEqual({ root: "C", quality: "maj7" });
		expect(chords[1]).toEqual({ root: "A", quality: "min7" });
		expect(chords[2]).toEqual({ root: "G", quality: "dom7" });
		expect(chords[3]).toEqual({ root: "B", quality: "dim" });
	});

	it("parses repeat comments", () => {
		const input = [
			"{start_of_verse: Verse}",
			"{comment: x3}",
			"[C] [G]",
			"{end_of_verse}",
		].join("\n");
		const result = importChordPro(input);
		expect(result.sections[0].parts[0].repeatCount).toBe(3);
	});

	it("captures lyrics from chord tokens", () => {
		const input = [
			"{start_of_verse: Verse}",
			"[C]hello [G]world",
			"{end_of_verse}",
		].join("\n");
		const result = importChordPro(input);
		const bars = result.sections[0].parts[0].bars;
		expect(bars[0].lyric).toBe("hello");
		expect(bars[1].lyric).toBe("world");
	});

	it("handles bars with no lyrics", () => {
		const input = ["{start_of_verse: Verse}", "[C] [G]", "{end_of_verse}"].join(
			"\n",
		);
		const result = importChordPro(input);
		const bars = result.sections[0].parts[0].bars;
		expect(bars[0].lyric).toBeUndefined();
	});

	it("clamps BPM within valid range", () => {
		expect(importChordPro("{tempo: 10}").bpm).toBe(40);
		expect(importChordPro("{tempo: 999}").bpm).toBe(240);
	});

	it("clamps capo within valid range", () => {
		expect(importChordPro("{capo: -1}").capo).toBe(0);
		expect(importChordPro("{capo: 20}").capo).toBe(7);
	});

	it("ignores comment lines", () => {
		const input = "# this is a comment\n{title: Song}";
		expect(importChordPro(input).title).toBe("Song");
	});

	it("treats unknown qualities as major", () => {
		const input = ["{start_of_verse: V}", "[Cweird]", "{end_of_verse}"].join(
			"\n",
		);
		const result = importChordPro(input);
		expect(result.sections[0].parts[0].bars[0].slots[0].chord.quality).toBe(
			"maj",
		);
	});

	it("derives section name from tag when label is omitted", () => {
		const input = ["{start_of_chorus}", "[C]", "{end_of_chorus}"].join("\n");
		const result = importChordPro(input);
		expect(result.sections[0].name).toBe("Chorus");
	});

	it("handles flat/sharp root notes", () => {
		const input = ["{start_of_verse: V}", "[Bb] [F#m]", "{end_of_verse}"].join(
			"\n",
		);
		const result = importChordPro(input);
		const chords = result.sections[0].parts[0].bars.map(
			(b) => b.slots[0].chord,
		);
		expect(chords[0]).toEqual({ root: "Bb", quality: "maj" });
		expect(chords[1]).toEqual({ root: "F#", quality: "min" });
	});

	it("handles augmented and sus chords", () => {
		const input = [
			"{start_of_verse: V}",
			"[C+] [Dsus4] [Esus2]",
			"{end_of_verse}",
		].join("\n");
		const result = importChordPro(input);
		const chords = result.sections[0].parts[0].bars.map(
			(b) => b.slots[0].chord,
		);
		expect(chords[0].quality).toBe("aug");
		expect(chords[1].quality).toBe("sus4");
		expect(chords[2].quality).toBe("sus2");
	});

	it("parses half-diminished chords (ø7 and m7b5)", () => {
		const input = ["{start_of_verse: V}", "[Bm7b5]", "{end_of_verse}"].join(
			"\n",
		);
		const result = importChordPro(input);
		expect(result.sections[0].parts[0].bars[0].slots[0].chord.quality).toBe(
			"min7b5",
		);
	});
});

// ─── Round-trip ──────────────────────────────────────────────────────────────

describe("ChordPro round-trip", () => {
	it("export → import preserves metadata", () => {
		const song = makeSong({
			title: "Round Trip",
			key: "Eb",
			mode: "minor",
			bpm: 140,
			capo: 2,
			timeSignature: { numerator: 3, denominator: 4 },
		});
		const result = importChordPro(exportChordPro(song));
		expect(result.title).toBe("Round Trip");
		expect(result.key).toBe("Eb");
		expect(result.mode).toBe("minor");
		expect(result.bpm).toBe(140);
		expect(result.capo).toBe(2);
		expect(result.timeSignature).toEqual({ numerator: 3, denominator: 4 });
	});

	it("export → import preserves chords", () => {
		const ts = { numerator: 4, denominator: 4 };
		const song = makeSong({
			sections: [
				createSection("Verse", [
					createPart([
						createBar([{ root: "C", quality: "maj" }], ts),
						createBar([{ root: "G", quality: "dom7" }], ts),
						createBar([{ root: "A", quality: "min" }], ts),
						createBar([{ root: "F", quality: "maj" }], ts),
					]),
				]),
			],
		});
		const result = importChordPro(exportChordPro(song));
		const chords = result.sections[0].parts[0].bars.map(
			(b) => b.slots[0].chord,
		);
		expect(chords[0]).toEqual({ root: "C", quality: "maj" });
		expect(chords[1]).toEqual({ root: "G", quality: "dom7" });
		expect(chords[2]).toEqual({ root: "A", quality: "min" });
		expect(chords[3]).toEqual({ root: "F", quality: "maj" });
	});

	it("export → import preserves lyrics", () => {
		const ts = { numerator: 4, denominator: 4 };
		const song = makeSong({
			sections: [
				createSection("Verse", [
					createPart([
						createBar([{ root: "C", quality: "maj" }], ts, "hello"),
						createBar([{ root: "G", quality: "maj" }], ts, "world"),
					]),
				]),
			],
		});
		const result = importChordPro(exportChordPro(song));
		const bars = result.sections[0].parts[0].bars;
		expect(bars[0].lyric).toBe("hello");
		expect(bars[1].lyric).toBe("world");
	});
});
