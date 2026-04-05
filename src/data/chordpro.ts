/**
 * chordpro.ts
 * ChordPro (.cho) export and import.
 *
 * Export: Song → ChordPro string
 * Import: ChordPro string → { title, key, mode, bpm, timeSignature, capo, sections }
 *
 * Spec reference: https://www.chordpro.org/
 */

import type { Bar, Section, TimeSignature } from "../theory/model";
import type { Chord, ChordQuality } from "../theory/chords";
import type { NoteName, ScaleMode } from "../theory/notes";
import type { Song } from "../theory/model";
import { createBar, createPart, createSection } from "../theory/songFactory";

// ─── Chord rendering ─────────────────────────────────────────────────────────

/** ChordPro-safe ASCII suffix per quality (avoids °, ø symbols). */
const EXPORT_SUFFIX: Record<ChordQuality, string> = {
	maj: "",
	min: "m",
	dom7: "7",
	maj7: "maj7",
	min7: "m7",
	dim: "dim",
	aug: "+",
	sus2: "sus2",
	sus4: "sus4",
	add9: "add9",
	min7b5: "m7b5",
};

function chordToStr(chord: Chord): string {
	return `${chord.root}${EXPORT_SUFFIX[chord.quality]}`;
}

// ─── Section type helpers ────────────────────────────────────────────────────

function sectionType(name: string): "verse" | "chorus" | "bridge" {
	const n = name.toLowerCase();
	if (n.startsWith("chorus")) return "chorus";
	if (n.startsWith("bridge")) return "bridge";
	return "verse";
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Render a Song as a ChordPro string.
 * Each bar becomes one [Chord]lyric token on a line per part.
 * Only the first chord per bar is exported (multi-chord bars lose extra chords).
 */
export function exportChordPro(song: Song): string {
	const lines: string[] = [];

	lines.push(`{title: ${song.title}}`);
	lines.push(`{key: ${song.key} ${song.mode}}`);
	lines.push(`{tempo: ${song.bpm}}`);
	lines.push(
		`{time: ${song.timeSignature.numerator}/${song.timeSignature.denominator}}`,
	);
	if (song.capo > 0) lines.push(`{capo: ${song.capo}}`);

	for (const section of song.sections) {
		lines.push("");
		const type = sectionType(section.name);
		lines.push(`{start_of_${type}: ${section.name}}`);

		for (const part of section.parts) {
			if (part.repeatCount > 1) {
				lines.push(`{comment: x${part.repeatCount}}`);
			}
			if (part.bars.length === 0) continue;

			const tokens = part.bars
				.map((bar) => {
					const first = bar.slots[0]?.chord;
					if (!first) return null;
					// Extra chords in the bar go as [Chord] tags with no lyric text
					const extra = bar.slots
						.slice(1)
						.map((s) => `[${chordToStr(s.chord)}]`)
						.join("");
					return `[${chordToStr(first)}]${bar.lyric ?? ""}${extra}`;
				})
				.filter((t): t is string => t !== null);

			if (tokens.length > 0) lines.push(tokens.join(" "));
		}

		lines.push(`{end_of_${type}}`);
	}

	return lines.join("\n");
}

// ─── Chord name parsing ───────────────────────────────────────────────────────

/** Ordered longest-first to avoid prefix ambiguity (e.g. "m7" before "m"). */
const QUALITY_PATTERNS: Array<[string, ChordQuality]> = [
	["min7b5", "min7b5"],
	["m7b5", "min7b5"],
	["ø7", "min7b5"],
	["maj7", "maj7"],
	["M7", "maj7"],
	["m7", "min7"],
	["min7", "min7"],
	["add9", "add9"],
	["sus4", "sus4"],
	["sus2", "sus2"],
	["dim", "dim"],
	["°", "dim"],
	["aug", "aug"],
	["+", "aug"],
	["min", "min"],
	["m", "min"],
	["7", "dom7"],
];

function parseChordName(raw: string): Chord | null {
	const m = raw.match(/^([A-G][#b]?)(.*)/);
	if (!m) return null;
	const root = m[1] as NoteName;
	const suffix = m[2];
	if (suffix === "") return { root, quality: "maj" };
	for (const [pat, quality] of QUALITY_PATTERNS) {
		if (suffix === pat) return { root, quality };
	}
	// Unknown suffix: treat root as major (best-effort)
	return { root, quality: "maj" };
}

// ─── Import result ────────────────────────────────────────────────────────────

export interface ChordProImport {
	title: string;
	key: NoteName;
	mode: ScaleMode;
	bpm: number;
	timeSignature: TimeSignature;
	capo: number;
	sections: Section[];
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Parse a ChordPro string into song data.
 * Heuristics:
 *   - {start_of_*: Label} → new Section named Label
 *   - Chord lines: each [Chord]lyric token → one Bar
 *   - {comment: xN} → next part gets repeatCount N
 *   - Bars between section tags but outside any named section → "Verse"
 */
export function importChordPro(text: string): ChordProImport {
	let title = "Imported Song";
	let importKey: NoteName = "C";
	let mode: ScaleMode = "major";
	let bpm = 120;
	let timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
	let capo = 0;

	const sections: Section[] = [];
	let currentSectionName: string | null = null;
	let currentBars: Bar[] = [];
	let pendingRepeat = 1;

	function flushBars() {
		if (currentBars.length === 0) return;
		const name = currentSectionName ?? "Verse";
		let sec = sections.find((s) => s.name === name);
		if (!sec) {
			sec = createSection(name, []);
			sections.push(sec);
		}
		sec.parts.push(createPart([...currentBars], pendingRepeat));
		currentBars = [];
		pendingRepeat = 1;
	}

	for (const rawLine of text.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		// ── Directive ──
		const dir = line.match(/^\{([^:}]+)(?::\s*([^}]*))?\}/);
		if (dir) {
			const dirKey = dir[1].trim().toLowerCase().replace(/\s+/g, "_");
			const val = (dir[2] ?? "").trim();

			if (dirKey === "title") {
				title = val;
			} else if (dirKey === "key") {
				const withMode = val.match(/^([A-G][#b]?)\s+(major|minor)$/i);
				const minorShort = val.match(/^([A-G][#b]?)m$/);
				const plain = val.match(/^([A-G][#b]?)$/);
				if (withMode) {
					importKey = withMode[1] as NoteName;
					mode = withMode[2].toLowerCase() as ScaleMode;
				} else if (minorShort) {
					importKey = minorShort[1] as NoteName;
					mode = "minor";
				} else if (plain) {
					importKey = plain[1] as NoteName;
					mode = "major";
				}
			} else if (dirKey === "tempo") {
				const n = parseInt(val, 10);
				if (!isNaN(n)) bpm = Math.min(240, Math.max(40, n));
			} else if (dirKey === "time") {
				const ts = val.match(/^(\d+)\/(\d+)$/);
				if (ts)
					timeSignature = {
						numerator: parseInt(ts[1], 10),
						denominator: parseInt(ts[2], 10),
					};
			} else if (dirKey === "capo") {
				const c = parseInt(val, 10);
				if (!isNaN(c)) capo = Math.min(7, Math.max(0, c));
			} else if (dirKey === "comment") {
				const rep = val.match(/^x(\d+)$/i);
				if (rep) pendingRepeat = parseInt(rep[1], 10);
			} else if (dirKey.startsWith("start_of_")) {
				flushBars();
				if (val) {
					currentSectionName =
						val.charAt(0).toUpperCase() + val.slice(1);
				} else {
					// Derive from tag, e.g. "start_of_chorus" → "Chorus"
					const derived = dirKey
						.replace("start_of_", "")
						.replace(/_/g, " ");
					currentSectionName =
						derived.charAt(0).toUpperCase() + derived.slice(1);
				}
			} else if (dirKey.startsWith("end_of_")) {
				flushBars();
				currentSectionName = null;
			}
			continue;
		}

		// ── Chord line ──
		if (!line.includes("[")) continue;

		// Split on the start of each [Chord] token
		const segments = line.split(/(?=\[)/);
		for (const seg of segments) {
			const m = seg.match(/^\[([^\]]*)\](.*)/);
			if (!m) continue;
			const chord = parseChordName(m[1].trim());
			if (!chord) continue;
			// Strip any stray [Chord] remnants from the lyric portion
			const lyric = m[2].replace(/\[[^\]]*\]/g, "").trim();
			currentBars.push(createBar([chord], timeSignature, lyric || undefined));
		}
	}

	flushBars();

	return { title, key: importKey, mode, bpm, timeSignature, capo, sections };
}
