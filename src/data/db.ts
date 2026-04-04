import Dexie, { type Table } from "dexie";
import type { Song } from "../theory/model";

export interface AppSettings {
	id: "global";
	lastSongCount: number;
}

class AppDb extends Dexie {
	songs!: Table<Song, string>;
	settings!: Table<AppSettings, string>;

	constructor() {
		super("unchorded");
		this.version(1).stores({
			songs: "id, updatedAt, createdAt",
			settings: "id",
		});
	}
}

export const db = new AppDb();
