/**
 * engine.ts
 * Audio playback engine wrapping Tone.js Transport + Sampler.
 *
 * Usage:
 *   await audioEngine.load("piano");   // fetch + decode samples
 *   audioEngine.schedule(song);        // build Tone.Part schedule
 *   await audioEngine.play();          // resume AudioContext + start Transport
 *   audioEngine.pause() / .stop()
 */

import * as Tone from "tone";
import { chordToMidi } from "../theory/chords";
import { ticksPerBar } from "../theory/model";
import type { Song } from "../theory/model";
import { drumEngine, findPattern } from "./drums";

// ─── MIDI → note name ────────────────────────────────────────────────────────

const NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B",
] as const;

function midiToNote(midi: number): string {
	return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

// ─── Sample configurations ───────────────────────────────────────────────────

const PIANO_BASE = "https://tonejs.github.io/audio/salamander/";
const PIANO_URLS: Record<string, string> = {
	A0: "A0.mp3",
	C1: "C1.mp3",
	"D#1": "Ds1.mp3",
	"F#1": "Fs1.mp3",
	A1: "A1.mp3",
	C2: "C2.mp3",
	"D#2": "Ds2.mp3",
	"F#2": "Fs2.mp3",
	A2: "A2.mp3",
	C3: "C3.mp3",
	"D#3": "Ds3.mp3",
	"F#3": "Fs3.mp3",
	A3: "A3.mp3",
	C4: "C4.mp3",
	"D#4": "Ds4.mp3",
	"F#4": "Fs4.mp3",
	A4: "A4.mp3",
	C5: "C5.mp3",
	"D#5": "Ds5.mp3",
	"F#5": "Fs5.mp3",
	A5: "A5.mp3",
	C6: "C6.mp3",
	"D#6": "Ds6.mp3",
	"F#6": "Fs6.mp3",
	A6: "A6.mp3",
	C7: "C7.mp3",
	"D#7": "Ds7.mp3",
	"F#7": "Fs7.mp3",
	A7: "A7.mp3",
	C8: "C8.mp3",
};

// Gleitz FluidR3 acoustic nylon guitar — open-string reference notes + reach
const GUITAR_BASE =
	"https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/";
const GUITAR_URLS: Record<string, string> = {
	E2: "E2.mp3",
	A2: "A2.mp3",
	D3: "D3.mp3",
	G3: "G3.mp3",
	B3: "B3.mp3",
	E4: "E4.mp3",
	A4: "A4.mp3",
	D5: "D5.mp3",
	G5: "G5.mp3",
};

const SAMPLE_URLS: Record<"guitar" | "piano", Record<string, string>> = {
	piano: PIANO_URLS,
	guitar: GUITAR_URLS,
};

const SAMPLE_BASE: Record<"guitar" | "piano", string> = {
	piano: PIANO_BASE,
	guitar: GUITAR_BASE,
};

/** Octave for chord voicing: guitar sounds best rooted around 3, piano around 4. */
const CHORD_OCTAVE: Record<"guitar" | "piano", number> = {
	guitar: 3,
	piano: 4,
};

// ─── Event types ─────────────────────────────────────────────────────────────

interface ChordEvent {
	time: number; // seconds from transport start
	notes: string[]; // Tone.js note names, e.g. ["C4","E4","G4"]
	duration: number; // seconds
}

interface BarEvent {
	time: number;
	sectionId: string;
	partId: string;
	barId: string;
}

type BarCallback = (bar: {
	sectionId: string;
	partId: string;
	barId: string;
}) => void;

// ─── AudioEngine ─────────────────────────────────────────────────────────────

export class AudioEngine {
	private sampler: Tone.Sampler | null = null;
	private parts: Tone.Part[] = [];
	private currentInstrument: "guitar" | "piano" | null = null;
	private readonly barCallbacks = new Set<BarCallback>();

	/**
	 * Load (or reuse) the sampler for the given instrument.
	 * Must be called before schedule(). Resolves when all samples are decoded.
	 */
	async load(instrument: "guitar" | "piano"): Promise<void> {
		if (this.currentInstrument === instrument && this.sampler !== null) return;
		this.sampler?.dispose();
		this.sampler = new Tone.Sampler({
			urls: SAMPLE_URLS[instrument],
			baseUrl: SAMPLE_BASE[instrument],
			release: 1,
		}).toDestination();
		this.currentInstrument = instrument;
		await Tone.loaded();
	}

	/**
	 * Build Tone.Part schedules from a Song. Replaces any previous schedule.
	 * Call load() first so the sampler is ready.
	 */
	schedule(song: Song): void {
		this.clearParts();

		const transport = Tone.getTransport();
		transport.bpm.value = song.bpm;
		// Tone.js timeSignature accepts the numerator for simple-meter signatures
		transport.timeSignature = song.timeSignature.numerator;

		// Seconds per 16th-note tick (4 ticks = 1 quarter note)
		const spTick = 60 / (song.bpm * 4);
		const tpb = ticksPerBar(song.timeSignature);
		const octave = CHORD_OCTAVE[song.instrument];

		const chordEvents: ChordEvent[] = [];
		const barEvents: BarEvent[] = [];

		let absoluteTick = 0;

		for (const section of song.sections) {
			for (const part of section.parts) {
				for (let rep = 0; rep < part.repeatCount; rep++) {
					for (const bar of part.bars) {
						barEvents.push({
							time: absoluteTick * spTick,
							sectionId: section.id,
							partId: part.id,
							barId: bar.id,
						});
						for (const slot of bar.slots) {
							chordEvents.push({
								time: (absoluteTick + slot.startTick) * spTick,
								notes: chordToMidi(slot.chord, octave).map(midiToNote),
								duration: slot.durationTicks * spTick,
							});
						}
						absoluteTick += tpb;
					}
				}
			}
		}

		// ── Drum scheduling ────────────────────────────────────────────────────
		const drumPattern = song.drumPatternId
			? findPattern(song.drumPatternId)
			: null;
		if (drumPattern) {
			drumEngine.init();
			drumEngine.schedule(drumPattern);
		} else {
			drumEngine.clearSequences();
		}

		if (chordEvents.length === 0) return;

		transport.loop = true;
		transport.loopStart = 0;
		transport.loopEnd = absoluteTick * spTick;

		const chordPart = new Tone.Part<ChordEvent>((time, event) => {
			this.sampler?.triggerAttackRelease(event.notes, event.duration, time);
		}, chordEvents);
		chordPart.start(0);
		this.parts.push(chordPart);

		if (barEvents.length > 0) {
			const barPart = new Tone.Part<BarEvent>((_, event) => {
				for (const cb of this.barCallbacks)
					cb({
						sectionId: event.sectionId,
						partId: event.partId,
						barId: event.barId,
					});
			}, barEvents);
			barPart.start(0);
			this.parts.push(barPart);
		}
	}

	/** Resume the AudioContext (required by browser policy) then start Transport. */
	async play(): Promise<void> {
		await Tone.start();
		Tone.getTransport().start();
	}

	pause(): void {
		Tone.getTransport().pause();
	}

	stop(): void {
		const transport = Tone.getTransport();
		transport.stop();
		transport.position = "0:0:0";
	}

	/**
	 * Register a callback invoked on each new bar during playback.
	 * Returns an unsubscribe function.
	 */
	onBar(cb: BarCallback): () => void {
		this.barCallbacks.add(cb);
		return () => this.barCallbacks.delete(cb);
	}

	private clearParts(): void {
		for (const p of this.parts) p.dispose();
		this.parts = [];
		drumEngine.clearSequences();
	}
}

export const audioEngine = new AudioEngine();
