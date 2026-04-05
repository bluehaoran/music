import type { Bar, Part, Section, Song } from "../theory/model";
import { type Chord } from "../theory/chords";
import {
	createBar,
	createPart,
	createSection,
	createSong,
	type NewSongOptions,
} from "../theory/songFactory";
import { db } from "./db";

export async function getAllSongs() {
	return db.songs.orderBy("updatedAt").reverse().toArray();
}

export async function getSong(id: string) {
	return db.songs.get(id);
}

export async function addSong(options: NewSongOptions = {}) {
	return db.transaction("rw", db.songs, db.settings, async () => {
		let settings = await db.settings.get("global");
		if (!settings) {
			settings = { id: "global", lastSongCount: 0 };
		}
		const nextCount = settings.lastSongCount + 1;
		const song = createSong(nextCount, options);
		await db.songs.add(song);
		await db.settings.put({ ...settings, lastSongCount: nextCount });
		return song;
	});
}

export async function updateSong(id: string, partial: Partial<Omit<Song, "id">>) {
	await db.songs.update(id, { ...partial, updatedAt: Date.now() });
}

export async function deleteSong(id: string) {
	await db.songs.delete(id);
}

// ─── Section / Part / Bar mutations ─────────────────────────────────────────

async function mutateSong(
	songId: string,
	fn: (song: Song) => Partial<Omit<Song, "id">>,
): Promise<void> {
	const song = await db.songs.get(songId);
	if (!song) return;
	await db.songs.update(songId, { ...fn(song), updatedAt: Date.now() });
}

export async function addSection(songId: string, name: string): Promise<void> {
	const section = createSection(name, [createPart()]);
	await mutateSong(songId, (s) => ({
		sections: [...s.sections, section],
	}));
}

export async function renameSection(
	songId: string,
	sectionId: string,
	name: string,
): Promise<void> {
	await mutateSong(songId, (s) => ({
		sections: s.sections.map((sec) =>
			sec.id === sectionId ? { ...sec, name } : sec,
		),
	}));
}

export async function removeSection(
	songId: string,
	sectionId: string,
): Promise<void> {
	await mutateSong(songId, (s) => ({
		sections: s.sections.filter((sec) => sec.id !== sectionId),
	}));
}

export async function addBars(
	songId: string,
	sectionId: string,
	partId: string,
	bars: Bar[],
): Promise<void> {
	await mutateSong(songId, (s) => ({
		sections: s.sections.map((sec) =>
			sec.id !== sectionId
				? sec
				: {
						...sec,
						parts: sec.parts.map((p) =>
							p.id !== partId ? p : { ...p, bars: [...p.bars, ...bars] },
						),
					},
		),
	}));
}

export async function replaceBar(
	songId: string,
	sectionId: string,
	partId: string,
	bar: Bar,
): Promise<void> {
	await mutateSong(songId, (s) => ({
		sections: s.sections.map((sec) =>
			sec.id !== sectionId
				? sec
				: {
						...sec,
						parts: sec.parts.map((p) =>
							p.id !== partId
								? p
								: { ...p, bars: p.bars.map((b) => (b.id === bar.id ? bar : b)) },
						),
					},
		),
	}));
}

export async function removeBar(
	songId: string,
	sectionId: string,
	partId: string,
	barId: string,
): Promise<void> {
	await mutateSong(songId, (s) => ({
		sections: s.sections.map((sec) =>
			sec.id !== sectionId
				? sec
				: {
						...sec,
						parts: sec.parts.map((p) =>
							p.id !== partId
								? p
								: { ...p, bars: p.bars.filter((b) => b.id !== barId) },
						),
					},
		),
	}));
}

/**
 * Save pending chords to the arrangement (1 chord = 1 bar).
 * Appends to the last section's last part; creates a "Verse" section if needed.
 */
export async function saveChordsToArrangement(
	song: Song,
	chords: Chord[],
): Promise<void> {
	if (chords.length === 0) return;
	const bars = chords.map((chord) => createBar([chord], song.timeSignature));
	if (song.sections.length === 0) {
		const part = createPart(bars);
		const section = createSection("Verse", [part]);
		await updateSong(song.id, { sections: [section] });
	} else {
		const lastSec = song.sections[song.sections.length - 1];
		const lastPart = lastSec.parts[lastSec.parts.length - 1];
		await addBars(song.id, lastSec.id, lastPart.id, bars);
	}
}
