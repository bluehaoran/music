import Dexie, { type Table } from "dexie";
import type { DrumPattern, Song } from "../theory/model";

export interface AppSettings {
	id: "global";
	lastSongCount: number;
}

class AppDb extends Dexie {
	songs!: Table<Song, string>;
	settings!: Table<AppSettings, string>;
	drumPatterns!: Table<DrumPattern, string>;

	constructor() {
		super("unchorded");
		this.version(1).stores({
			songs: "id, updatedAt, createdAt",
			settings: "id",
		});
		this.version(2).stores({
			songs: "id, updatedAt, createdAt",
			settings: "id",
			drumPatterns: "id, name",
		});
	}
}

export const db = new AppDb();
