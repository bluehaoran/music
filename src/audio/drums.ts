/**
 * drums.ts
 * Built-in drum pattern library and synth drum engine.
 */

import * as Tone from "tone";
import type {
	DrumPattern,
	DrumSound,
	DrumStep,
	TimeSignature,
} from "../theory/model";

// ─── Built-in patterns ───────────────────────────────────────────────────────

export const BUILTIN_PATTERNS: DrumPattern[] = [
	{
		id: "rock",
		name: "Rock",
		timeSignature: { numerator: 4, denominator: 4 },
		subdivision: "4n",
		tracks: {
			bd: ["bd", null, null, null],
			sn: [null, "sn", null, "sn"],
			hh: ["hh", "hh", "hh", "hh"],
		},
	},
	{
		id: "pop16",
		name: "Pop 16-beat",
		timeSignature: { numerator: 4, denominator: 4 },
		subdivision: "4n",
		tracks: {
			bd: ["bd", null, "bd", null],
			sn: [null, "sn", null, "sn"],
			hh: [
				["hh", "hh"],
				["hh", "hh"],
				["hh", "hh"],
				["hh", "hh"],
			],
		},
	},
	{
		id: "shuffle",
		name: "Shuffle",
		timeSignature: { numerator: 4, denominator: 4 },
		subdivision: "4n",
		tracks: {
			bd: ["bd", null, null, ["bd", null]],
			sn: [null, ["sn", null], null, null],
			hh: [
				["hh", null],
				["hh", null],
				["hh", null],
				["hh", null],
			],
		},
	},
	{
		id: "bossa",
		name: "Bossa Nova",
		timeSignature: { numerator: 4, denominator: 4 },
		subdivision: "4n",
		tracks: {
			bd: ["bd", null, "bd", null],
			sn: [null, null, "sn", null],
			hh: [["hh", null], "hh", ["hh", "hh"], ["hh", null]],
		},
	},
	{
		id: "waltz",
		name: "Waltz",
		timeSignature: { numerator: 3, denominator: 4 },
		subdivision: "4n",
		tracks: {
			bd: ["bd", null, null],
			sn: [null, "sn", "sn"],
			hh: ["hh", "hh", "hh"],
		},
	},
	{
		id: "waltz-slow",
		name: "Waltz Slow",
		timeSignature: { numerator: 3, denominator: 4 },
		subdivision: "4n",
		tracks: {
			bd: ["bd", null, null],
			sn: [null, "sn", null],
			hh: [
				["hh", "hh"],
				["hh", "hh"],
				["hh", "hh"],
			],
		},
	},
	{
		id: "waltz68",
		name: "Waltz68",
		timeSignature: { numerator: 6, denominator: 8 },
		subdivision: "8n",
		tracks: {
			bd: ["bd", null, null, null, null, null],
			sn: [null, "hh", "hh", null, "hh", "hh"],
			hh: [null, null, null, "sn", null, null],
		},
	},
];

// ─── Drum engine ─────────────────────────────────────────────────────────────

export class DrumEngine {
	private kick: Tone.MembraneSynth | null = null;
	private snare: Tone.NoiseSynth | null = null;
	private hihat: Tone.MetalSynth | null = null;
	private rimshot: Tone.NoiseSynth | null = null;
	private ride: Tone.MetalSynth | null = null;
	private tom: Tone.MembraneSynth | null = null;
	private sequences: Tone.Sequence<DrumStep>[] = [];

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

		this.rimshot = new Tone.NoiseSynth({
			noise: { type: "pink" },
			envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
		}).toDestination();
		this.rimshot.volume.value = -8;

		this.ride = new Tone.MetalSynth({
			envelope: { attack: 0.001, decay: 0.4, release: 0.3, sustain: 0.05 },
			harmonicity: 3.1,
			modulationIndex: 16,
			resonance: 3200,
			octaves: 1.2,
		}).toDestination();
		this.ride.frequency.value = 280;
		this.ride.volume.value = -12;

		this.tom = new Tone.MembraneSynth({
			pitchDecay: 0.08,
			octaves: 4,
			oscillator: { type: "sine" },
			envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
		}).toDestination();
		this.tom.volume.value = -2;
	}

	schedule(pattern: DrumPattern): void {
		this.clearSequences();
		if (!this.kick || !this.snare || !this.hihat || !this.rimshot || !this.ride || !this.tom) return;

		const kick = this.kick;
		const snare = this.snare;
		const hihat = this.hihat;
		const rimshot = this.rimshot;
		const ride = this.ride;
		const tom = this.tom;

		const trigger = (sound: DrumSound, time: number) => {
			if (sound === "bd") kick.triggerAttackRelease("C1", "8n", time);
			else if (sound === "sn") snare.triggerAttackRelease("8n", time);
			else if (sound === "hh") hihat.triggerAttackRelease("32n", time);
			else if (sound === "oh") hihat.triggerAttackRelease("8n", time);
			else if (sound === "rs") rimshot.triggerAttackRelease("16n", time);
			else if (sound === "rd") ride.triggerAttackRelease("16n", time);
			else if (sound === "tm") tom.triggerAttackRelease("G1", "8n", time);
		};

		for (const [sound, track] of Object.entries(pattern.tracks) as [
			DrumSound,
			(typeof pattern.tracks)[DrumSound],
		][]) {
			if (!track) continue;
			const seq = new Tone.Sequence<DrumStep>(
				(time, step) => {
					if (step) trigger(sound, time);
				},
				track,
				pattern.subdivision,
			);
			seq.start(0);
			this.sequences.push(seq);
		}
	}

	clearSequences(): void {
		for (const s of this.sequences) s.dispose();
		this.sequences = [];
	}

	dispose(): void {
		this.clearSequences();
		this.kick?.dispose();
		this.kick = null;
		this.snare?.dispose();
		this.snare = null;
		this.hihat?.dispose();
		this.hihat = null;
		this.rimshot?.dispose();
		this.rimshot = null;
		this.ride?.dispose();
		this.ride = null;
		this.tom?.dispose();
		this.tom = null;
	}
}

export const drumEngine = new DrumEngine();

// ─── Custom pattern registry ─────────────────────────────────────────────────

let _customPatterns: DrumPattern[] = [];

export function setCustomPatterns(patterns: DrumPattern[]): void {
	_customPatterns = patterns;
}

export function getCustomPatterns(): DrumPattern[] {
	return _customPatterns;
}

/** Returns all patterns (built-in + custom) compatible with a given time signature. */
export function patternsForTimeSig(ts: TimeSignature): DrumPattern[] {
	const all = [...BUILTIN_PATTERNS, ..._customPatterns];
	return all.filter(
		(p) =>
			p.timeSignature.numerator === ts.numerator &&
			p.timeSignature.denominator === ts.denominator,
	);
}

/** Find a pattern by id across built-in and custom patterns. */
export function findPattern(id: string): DrumPattern | undefined {
	return (
		BUILTIN_PATTERNS.find((p) => p.id === id) ??
		_customPatterns.find((p) => p.id === id)
	);
}
