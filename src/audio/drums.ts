/**
 * drums.ts
 * Built-in drum pattern library, Strudel notation parser, and synth drum engine.
 *
 * Strudel notation: comma-separated tracks, each a space-separated sequence.
 *   "bd ~ ~ ~, ~ sn ~ sn, hh hh hh hh"
 *   Sounds: bd (kick), sn (snare), hh (closed hi-hat), oh (open hi-hat)
 *   ~  = rest
 *
 * Timing: each track divides the bar into equal slots. A track with N events
 * occupies tpb / N ticks per slot. Non-integer values are rounded.
 */

import * as Tone from "tone";
import type { DrumPattern, TimeSignature } from "../theory/model";
import { ticksPerBar } from "../theory/model";

// ─── Built-in patterns ───────────────────────────────────────────────────────

export const BUILTIN_PATTERNS: DrumPattern[] = [
	{
		id: "rock",
		name: "Rock",
		timeSignature: { numerator: 4, denominator: 4 },
		strudel: "bd ~ ~ ~, ~ sn ~ sn, hh hh hh hh",
	},
	{
		id: "pop16",
		name: "Pop 16-beat",
		timeSignature: { numerator: 4, denominator: 4 },
		strudel: "bd ~ bd ~, ~ sn ~ sn, hh hh hh hh hh hh hh hh",
	},
	{
		id: "shuffle",
		name: "Shuffle",
		timeSignature: { numerator: 4, denominator: 4 },
		strudel: "bd ~ ~ bd ~, ~ sn ~ ~ sn, hh ~ hh ~ hh ~ hh ~",
	},
	{
		id: "bossa",
		name: "Bossa Nova",
		timeSignature: { numerator: 4, denominator: 4 },
		strudel: "bd ~ bd ~, ~ ~ sn ~, hh ~ hh hh ~ hh hh ~",
	},
	{
		id: "waltz",
		name: "Waltz",
		timeSignature: { numerator: 3, denominator: 4 },
		strudel: "bd ~ ~, ~ sn sn, hh hh hh",
	},
	{
		id: "waltz-slow",
		name: "Waltz Slow",
		timeSignature: { numerator: 3, denominator: 4 },
		strudel: "bd ~ ~, ~ sn ~, hh hh hh hh hh hh",
	},
];

// ─── Strudel parser ──────────────────────────────────────────────────────────

type DrumSound = "bd" | "sn" | "hh" | "oh";
const DRUM_SOUNDS: Set<string> = new Set(["bd", "sn", "hh", "oh"]);

interface DrumHit {
	sound: DrumSound;
	tick: number; // 16th-note tick offset within bar
}

export function parseStrudel(strudel: string, tpb: number): DrumHit[] {
	const hits: DrumHit[] = [];
	const tracks = strudel.split(",").map((t) => t.trim());

	for (const track of tracks) {
		const events = track.split(/\s+/).filter(Boolean);
		if (events.length === 0) continue;
		const ticksPerEvent = tpb / events.length;

		for (let i = 0; i < events.length; i++) {
			const e = events[i];
			if (e === "~") continue;
			if (DRUM_SOUNDS.has(e)) {
				hits.push({
					sound: e as DrumSound,
					tick: Math.round(i * ticksPerEvent),
				});
			}
		}
	}

	return hits;
}

// ─── Drum engine ─────────────────────────────────────────────────────────────

interface HitEvent {
	time: number;
	sound: DrumSound;
}

export class DrumEngine {
	private kick: Tone.MembraneSynth | null = null;
	private snare: Tone.NoiseSynth | null = null;
	private hihat: Tone.MetalSynth | null = null;
	private parts: Tone.Part<HitEvent>[] = [];

	/** Lazy-initialise synths (deferred until first use to avoid audio context issues). */
	init(): void {
		if (this.kick) return;

		this.kick = new Tone.MembraneSynth({
			pitchDecay: 0.05,
			octaves: 6,
			oscillator: { type: "sine" },
			envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
		}).toDestination();
		this.kick.volume.value = 2;

		this.snare = new Tone.NoiseSynth({
			noise: { type: "white" },
			envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
		}).toDestination();
		this.snare.volume.value = -4;

		this.hihat = new Tone.MetalSynth({
			envelope: { attack: 0.001, decay: 0.08, release: 0.01, sustain: 0 },
			harmonicity: 5.1,
			modulationIndex: 32,
			resonance: 4000,
			octaves: 1.5,
		}).toDestination();
		this.hihat.frequency.value = 400;
		this.hihat.volume.value = -10;
	}

	/**
	 * Schedule a drum pattern to loop every bar.
	 * spTick: seconds per 16th-note tick. tpb: ticks per bar.
	 */
	schedule(pattern: DrumPattern, spTick: number, tpb: number): void {
		this.clearParts();
		if (!this.kick || !this.snare || !this.hihat) return;

		const hits = parseStrudel(pattern.strudel, tpb);
		const loopEnd = tpb * spTick;

		const events: HitEvent[] = hits.map((h) => ({
			time: h.tick * spTick,
			sound: h.sound,
		}));

		if (events.length === 0) return;

		const kick = this.kick;
		const snare = this.snare;
		const hihat = this.hihat;

		const part = new Tone.Part<HitEvent>((time, ev) => {
			if (ev.sound === "bd") kick.triggerAttackRelease("C1", "8n", time);
			else if (ev.sound === "sn") snare.triggerAttackRelease("8n", time);
			else if (ev.sound === "hh") hihat.triggerAttackRelease("32n", time);
			else if (ev.sound === "oh") hihat.triggerAttackRelease("8n", time);
		}, events);

		part.loop = true;
		part.loopEnd = loopEnd;
		part.start(0);
		this.parts.push(part);
	}

	clearParts(): void {
		for (const p of this.parts) p.dispose();
		this.parts = [];
	}

	dispose(): void {
		this.clearParts();
		this.kick?.dispose();
		this.kick = null;
		this.snare?.dispose();
		this.snare = null;
		this.hihat?.dispose();
		this.hihat = null;
	}
}

export const drumEngine = new DrumEngine();

/** Returns patterns compatible with a given time signature. */
export function patternsForTimeSig(ts: TimeSignature): DrumPattern[] {
	return BUILTIN_PATTERNS.filter(
		(p) =>
			p.timeSignature.numerator === ts.numerator &&
			p.timeSignature.denominator === ts.denominator,
	);
}
