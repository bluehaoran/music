/**
 * songRepo.test.ts
 * Unit tests for songRepo mutations using a mocked Dexie db.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Song } from "../theory/model";
import { createBar, createPart, createSection } from "../theory/songFactory";

// ─── Mock db ────────────────────────────────────────────────────────────────

/** In-memory song store keyed by id. */
let store: Map<string, Song>;

/** Tracks settings for addSong. */
let settingsStore: Map<string, { id: string; lastSongCount: number }>;

vi.mock("./db", () => {
	// Return a factory that re-uses `store` (defined above, shared via closure)
	const songs = {
		get: vi.fn(async (id: string) => store.get(id)),
		add: vi.fn(async (song: Song) => {
			store.set(song.id, song);
		}),
		update: vi.fn(async (id: string, changes: Partial<Song>) => {
			const existing = store.get(id);
			if (!existing) return 0;
			store.set(id, { ...existing, ...changes });
			return 1;
		}),
		delete: vi.fn(async (id: string) => {
			store.delete(id);
		}),
		orderBy: vi.fn(() => ({
			reverse: vi.fn(() => ({
				toArray: vi.fn(async () => [...store.values()]),
			})),
		})),
	};

	const settings = {
		get: vi.fn(async (id: string) => settingsStore.get(id)),
		put: vi.fn(async (val: { id: string; lastSongCount: number }) => {
			settingsStore.set(val.id, val);
		}),
	};

	return {
		db: {
			songs,
			settings,
			transaction: vi.fn(async (...args: unknown[]) => {
				// Last argument is always the callback
				const callback = args[args.length - 1] as () => Promise<unknown>;
				return callback();
			}),
		},
	};
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSong(overrides: Partial<Song> = {}): Song {
	return {
		id: "test-song",
		title: "Test",
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

const TS = { numerator: 4, denominator: 4 };

// ─── Tests ──────────────────────────────────────────────────────────────────

// Import after mock setup
import {
	addSection,
	removeSection,
	renameSection,
	addBars,
	removeBar,
	replaceBar,
	addSlotToBar,
	replaceSlotInBar,
	updateBarLyrics,
	updatePartRepeatCount,
	updateSong,
	deleteSong,
	getSong,
	getAllSongs,
} from "./songRepo";

beforeEach(() => {
	store = new Map();
	settingsStore = new Map();
});

describe("songRepo CRUD", () => {
	it("getSong returns a stored song", async () => {
		const song = makeSong();
		store.set(song.id, song);
		const result = await getSong("test-song");
		expect(result).toEqual(song);
	});

	it("getSong returns undefined for missing id", async () => {
		expect(await getSong("nope")).toBeUndefined();
	});

	it("updateSong patches fields", async () => {
		store.set("s1", makeSong({ id: "s1", title: "Old" }));
		await updateSong("s1", { title: "New" });
		expect(store.get("s1")!.title).toBe("New");
	});

	it("updateSong sets updatedAt", async () => {
		store.set("s1", makeSong({ id: "s1", updatedAt: 0 }));
		await updateSong("s1", { title: "X" });
		expect(store.get("s1")!.updatedAt).toBeGreaterThan(0);
	});

	it("deleteSong removes from store", async () => {
		store.set("s1", makeSong({ id: "s1" }));
		await deleteSong("s1");
		expect(store.has("s1")).toBe(false);
	});
});

describe("section mutations", () => {
	it("addSection appends a section", async () => {
		const song = makeSong();
		store.set(song.id, song);
		await addSection(song.id, "Chorus");
		const updated = store.get(song.id)!;
		expect(updated.sections).toHaveLength(1);
		expect(updated.sections[0].name).toBe("Chorus");
		expect(updated.sections[0].parts).toHaveLength(1);
	});

	it("removeSection removes the target section", async () => {
		const sec1 = createSection("Verse", [createPart()]);
		const sec2 = createSection("Chorus", [createPart()]);
		const song = makeSong({ sections: [sec1, sec2] });
		store.set(song.id, song);
		await removeSection(song.id, sec1.id);
		const updated = store.get(song.id)!;
		expect(updated.sections).toHaveLength(1);
		expect(updated.sections[0].name).toBe("Chorus");
	});

	it("renameSection changes the section name", async () => {
		const sec = createSection("Verse", [createPart()]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);
		await renameSection(song.id, sec.id, "Bridge");
		expect(store.get(song.id)!.sections[0].name).toBe("Bridge");
	});
});

describe("bar mutations", () => {
	it("addBars appends bars to a part", async () => {
		const part = createPart([]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		const bar = createBar([{ root: "C", quality: "maj" }], TS);
		await addBars(song.id, sec.id, part.id, [bar]);

		const updated = store.get(song.id)!;
		expect(updated.sections[0].parts[0].bars).toHaveLength(1);
		expect(updated.sections[0].parts[0].bars[0].id).toBe(bar.id);
	});

	it("removeBar removes the target bar", async () => {
		const bar1 = createBar([{ root: "C", quality: "maj" }], TS);
		const bar2 = createBar([{ root: "G", quality: "maj" }], TS);
		const part = createPart([bar1, bar2]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		await removeBar(song.id, sec.id, part.id, bar1.id);
		const bars = store.get(song.id)!.sections[0].parts[0].bars;
		expect(bars).toHaveLength(1);
		expect(bars[0].id).toBe(bar2.id);
	});

	it("replaceBar swaps a bar in place", async () => {
		const bar = createBar([{ root: "C", quality: "maj" }], TS);
		const part = createPart([bar]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		const newBar = {
			...createBar([{ root: "D", quality: "min" }], TS),
			id: bar.id,
		};
		await replaceBar(song.id, sec.id, part.id, newBar);

		const updated = store.get(song.id)!.sections[0].parts[0].bars[0];
		expect(updated.slots[0].chord.root).toBe("D");
		expect(updated.slots[0].chord.quality).toBe("min");
	});
});

describe("slot mutations", () => {
	it("addSlotToBar adds a chord to a bar", async () => {
		const bar = createBar([{ root: "C", quality: "maj" }], TS);
		const part = createPart([bar]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		await addSlotToBar(song.id, sec.id, part.id, bar.id, {
			root: "G",
			quality: "maj",
		});

		const slots = store.get(song.id)!.sections[0].parts[0].bars[0].slots;
		expect(slots).toHaveLength(2);
		expect(slots[0].chord.root).toBe("C");
		expect(slots[1].chord.root).toBe("G");
	});

	it("addSlotToBar preserves bar id and lyric", async () => {
		const bar = createBar([{ root: "C", quality: "maj" }], TS, "hello");
		const part = createPart([bar]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		await addSlotToBar(song.id, sec.id, part.id, bar.id, {
			root: "G",
			quality: "maj",
		});

		const updatedBar = store.get(song.id)!.sections[0].parts[0].bars[0];
		expect(updatedBar.id).toBe(bar.id);
		expect(updatedBar.lyric).toBe("hello");
	});

	it("replaceSlotInBar changes a slot's chord", async () => {
		const bar = createBar(
			[
				{ root: "C", quality: "maj" },
				{ root: "G", quality: "maj" },
			],
			TS,
		);
		const part = createPart([bar]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		await replaceSlotInBar(song.id, sec.id, part.id, bar.id, 1, {
			root: "A",
			quality: "min",
		});

		const slots = store.get(song.id)!.sections[0].parts[0].bars[0].slots;
		expect(slots[0].chord.root).toBe("C");
		expect(slots[1].chord.root).toBe("A");
		expect(slots[1].chord.quality).toBe("min");
	});
});

describe("lyrics and repeat", () => {
	it("updateBarLyrics sets lyrics by bar id", async () => {
		const bar1 = createBar([{ root: "C", quality: "maj" }], TS);
		const bar2 = createBar([{ root: "G", quality: "maj" }], TS);
		const part = createPart([bar1, bar2]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		await updateBarLyrics(song.id, {
			[bar1.id]: "hello",
			[bar2.id]: "world",
		});

		const bars = store.get(song.id)!.sections[0].parts[0].bars;
		expect(bars[0].lyric).toBe("hello");
		expect(bars[1].lyric).toBe("world");
	});

	it("updateBarLyrics clears lyrics with empty string", async () => {
		const bar = createBar([{ root: "C", quality: "maj" }], TS, "old");
		const part = createPart([bar]);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		await updateBarLyrics(song.id, { [bar.id]: "" });
		expect(
			store.get(song.id)!.sections[0].parts[0].bars[0].lyric,
		).toBeUndefined();
	});

	it("updatePartRepeatCount sets repeat count", async () => {
		const part = createPart([], 1);
		const sec = createSection("Verse", [part]);
		const song = makeSong({ sections: [sec] });
		store.set(song.id, song);

		await updatePartRepeatCount(song.id, sec.id, part.id, 4);
		expect(store.get(song.id)!.sections[0].parts[0].repeatCount).toBe(4);
	});
});

describe("no-op on missing song", () => {
	it("mutateSong silently no-ops for missing songId", async () => {
		await addSection("nonexistent", "Verse");
		expect(store.size).toBe(0);
	});
});
