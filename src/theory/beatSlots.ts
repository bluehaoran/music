/**
 * beatSlots.ts
 * Helpers for building and mutating BeatSlot arrays within a bar.
 *
 * The fundamental invariant:
 *   sum of all slot durationTicks === ticksPerBar(timeSignature)
 *   no two slots overlap
 *   slots are ordered by startTick
 */

import type { Chord } from "./chords";
import {
	type BeatSlot,
	snapTick,
	type Tick,
	type TimeSignature,
	ticksPerBar,
} from "./model";

// Re-export timing helpers so callers can import everything from beatSlots
export { snapTick, ticksPerBar } from "./model";

// ─── Construction ────────────────────────────────────────────────────────────

/**
 * Create a single-chord bar (chord fills the whole bar).
 */
export function singleChordSlots(chord: Chord, ts: TimeSignature): BeatSlot[] {
	return [{ chord, startTick: 0, durationTicks: ticksPerBar(ts) }];
}

/**
 * Distribute N chords evenly across a bar.
 * If the bar doesn't divide evenly, the last chord absorbs the remainder.
 */
export function evenSplitSlots(chords: Chord[], ts: TimeSignature): BeatSlot[] {
	const total = ticksPerBar(ts);
	const n = chords.length;
	if (n === 0) return [];

	const baseDuration = Math.floor(total / n);
	const remainder = total - baseDuration * n;
	let cursor = 0;

	return chords.map((chord, i) => {
		const duration = baseDuration + (i === n - 1 ? remainder : 0);
		const slot: BeatSlot = {
			chord,
			startTick: cursor,
			durationTicks: duration,
		};
		cursor += duration;
		return slot;
	});
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Insert a new chord into a bar at a given tick position.
 * The existing slot at that tick is split: the new chord takes the second half.
 * Snaps to the nearest 16th note.
 */
export function insertChordAtTick(
	slots: BeatSlot[],
	chord: Chord,
	atTick: Tick,
	ts: TimeSignature,
): BeatSlot[] {
	const snapped = snapTick(atTick, 1); // 16th-note snap for insert
	const total = ticksPerBar(ts);

	// Find the slot that contains this tick
	const idx = slots.findIndex(
		(s) => s.startTick <= snapped && snapped < s.startTick + s.durationTicks,
	);
	if (idx === -1) return slots; // out of range, no-op

	const target = slots[idx];
	const splitAt = snapped - target.startTick;
	if (splitAt <= 0) return slots; // inserting at the very start of an existing chord

	const before: BeatSlot = {
		chord: target.chord,
		startTick: target.startTick,
		durationTicks: splitAt,
	};
	const inserted: BeatSlot = {
		chord,
		startTick: snapped,
		durationTicks: target.durationTicks - splitAt,
	};

	return [...slots.slice(0, idx), before, inserted, ...slots.slice(idx + 1)];
}

/**
 * Remove a chord slot at index, merging its duration into the preceding slot.
 * If it's the first slot, duration merges into the next slot.
 * Always maintains the total tick count.
 */
export function removeSlot(slots: BeatSlot[], index: number): BeatSlot[] {
	if (slots.length <= 1) return slots; // can't remove last chord
	const removed = slots[index];
	const next = slots.slice();
	next.splice(index, 1);

	if (index > 0) {
		// Merge into previous
		next[index - 1] = {
			...next[index - 1],
			durationTicks: next[index - 1].durationTicks + removed.durationTicks,
		};
	} else {
		// Merge into next (now at index 0)
		next[0] = {
			...next[0],
			startTick: 0,
			durationTicks: next[0].durationTicks + removed.durationTicks,
		};
	}
	return next;
}

/**
 * Move the boundary between two adjacent slots (drag resize).
 * Snaps to the preferred subdivision; clamps to keep both slots ≥ 1 tick.
 *
 * @param slots     The current slot array
 * @param boundary  The index of the LEFT slot (right slot = boundary + 1)
 * @param newTick   The new tick position for the boundary
 * @param snap      Snap resolution: 4 = quarter, 2 = eighth, 1 = 16th
 */
export function resizeBoundary(
	slots: BeatSlot[],
	boundary: number,
	newTick: Tick,
	snap: 4 | 2 | 1 = 4,
): BeatSlot[] {
	if (boundary < 0 || boundary >= slots.length - 1) return slots;

	const left = slots[boundary];
	const right = slots[boundary + 1];
	const minTick = left.startTick + 1;
	const maxTick = right.startTick + right.durationTicks - 1;
	const snappedTick = Math.min(
		maxTick,
		Math.max(minTick, snapTick(newTick, snap)),
	);

	const newLeft: BeatSlot = {
		...left,
		durationTicks: snappedTick - left.startTick,
	};
	const newRight: BeatSlot = {
		...right,
		startTick: snappedTick,
		durationTicks: right.startTick + right.durationTicks - snappedTick,
	};

	return [
		...slots.slice(0, boundary),
		newLeft,
		newRight,
		...slots.slice(boundary + 2),
	];
}

/**
 * Replace the chord in a slot without changing its timing.
 */
export function replaceChord(
	slots: BeatSlot[],
	index: number,
	chord: Chord,
): BeatSlot[] {
	return slots.map((s, i) => (i === index ? { ...s, chord } : s));
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

export function validateSlots(
	slots: BeatSlot[],
	ts: TimeSignature,
): ValidationResult {
	const errors: string[] = [];
	const total = ticksPerBar(ts);

	if (slots.length === 0) {
		errors.push("Bar has no chords.");
		return { valid: false, errors };
	}

	// Check start at tick 0
	if (slots[0].startTick !== 0) {
		errors.push(`First slot must start at tick 0, got ${slots[0].startTick}.`);
	}

	// Check ordering and no gaps/overlaps
	let cursor = 0;
	for (let i = 0; i < slots.length; i++) {
		const s = slots[i];
		if (s.startTick !== cursor) {
			errors.push(`Slot ${i} starts at ${s.startTick}, expected ${cursor}.`);
		}
		if (s.durationTicks < 1) {
			errors.push(`Slot ${i} has zero or negative duration.`);
		}
		cursor += s.durationTicks;
	}

	// Check total
	if (cursor !== total) {
		errors.push(
			`Slots total ${cursor} ticks, expected ${total} for ${ts.numerator}/${ts.denominator}.`,
		);
	}

	return { valid: errors.length === 0, errors };
}
