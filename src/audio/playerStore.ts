import { create } from "zustand";
import type { Song } from "../theory/model";
import { audioEngine } from "./engine";

export type PlaybackState = "stopped" | "playing" | "paused";

export interface PlayingBar {
	sectionId: string;
	partId: string;
	barId: string;
}

interface PlayerStore {
	/** Transport playback state. */
	state: PlaybackState;
	/** True while samples are being fetched/decoded. */
	isLoading: boolean;
	/** Identity of the bar currently playing (updated each new bar). */
	currentBar: PlayingBar | null;
	/** ID of the song currently loaded into the Transport schedule. */
	scheduledSongId: string | null;

	/**
	 * Load the instrument samples, schedule the song, and start playback.
	 * If the same song is paused, this resumes without re-scheduling.
	 */
	play(song: Song): Promise<void>;
	pause(): void;
	stop(): void;

	/** Internal — called by the audioEngine bar callback. */
	_setCurrentBar(bar: PlayingBar): void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
	state: "stopped",
	isLoading: false,
	currentBar: null,
	scheduledSongId: null,

	async play(song) {
		const { state, scheduledSongId } = get();

		// Resume if paused on the same song
		if (state === "paused" && scheduledSongId === song.id) {
			await audioEngine.play();
			set({ state: "playing" });
			return;
		}

		set({ isLoading: true, currentBar: null });
		try {
			await audioEngine.load(song.instrument);
			audioEngine.stop();
			audioEngine.schedule(song);
			await audioEngine.play();
			set({ state: "playing", isLoading: false, scheduledSongId: song.id });
		} catch (err) {
			console.error("[AudioEngine] playback error:", err);
			set({ isLoading: false });
		}
	},

	pause() {
		audioEngine.pause();
		set({ state: "paused" });
	},

	stop() {
		audioEngine.stop();
		set({ state: "stopped", currentBar: null });
	},

	_setCurrentBar(bar) {
		set({ currentBar: bar });
	},
}));

// Wire engine bar-progress events into the store
audioEngine.onBar((bar) => {
	usePlayerStore.getState()._setCurrentBar(bar);
});
