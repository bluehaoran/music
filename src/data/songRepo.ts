import type { Song } from "../theory/model";
import { createSong, type NewSongOptions } from "../theory/songFactory";
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
