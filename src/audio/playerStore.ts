import { create } from "zustand";
import type { Song } from "../theory/model";
import { audioEngine } from "./engine";

export type PlaybackState = "stopped" | "playing" | "paused";

interface PlayerStore {
	/** Transport playback state. */
	state: PlaybackState;
	/** True while samples are being fetched/decoded. */
	isLoading: boolean;
	/** 0-based index of the bar currently playing (updated each new bar). */
	currentBarIndex: number;
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
	_setBarIndex(i: number): void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
	state: "stopped",
	isLoading: false,
	currentBarIndex: 0,
	scheduledSongId: null,

	async play(song) {
		const { state, scheduledSongId } = get();

		// Resume if paused on the same song
		if (state === "paused" && scheduledSongId === song.id) {
			await audioEngine.play();
			set({ state: "playing" });
			return;
		}

		set({ isLoading: true, currentBarIndex: 0 });
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
		set({ state: "stopped", currentBarIndex: 0 });
	},

	_setBarIndex(i) {
		set({ currentBarIndex: i });
	},
}));

// Wire engine bar-progress events into the store
audioEngine.onBar((barIndex) => {
	usePlayerStore.getState()._setBarIndex(barIndex);
});
