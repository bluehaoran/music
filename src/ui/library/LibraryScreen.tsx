import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db } from "../../data/db";
import { addSong, deleteSong, updateSong } from "../../data/songRepo";
import { useNavStore } from "../../app/nav";
import type { ChordProImport } from "../../data/chordpro";
import { ImportSheet } from "./ImportSheet";

export function LibraryScreen() {
	const songs = useLiveQuery(() =>
		db.songs.orderBy("updatedAt").reverse().toArray(),
	);
	const goToEditor = useNavStore((s) => s.goToEditor);
	const [showImport, setShowImport] = useState(false);

	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLongPress = useRef(false);

	async function handleNew() {
		const song = await addSong();
		goToEditor(song.id);
	}

	async function handleImport(data: ChordProImport) {
		const song = await addSong({
			title: data.title,
			key: data.key,
			mode: data.mode,
			bpm: data.bpm,
			timeSignature: data.timeSignature,
			capo: data.capo,
		});
		if (data.sections.length > 0) {
			await updateSong(song.id, { sections: data.sections });
		}
		setShowImport(false);
		goToEditor(song.id);
	}

	function startLongPress(songId: string) {
		didLongPress.current = false;
		longPressTimer.current = setTimeout(async () => {
			didLongPress.current = true;
			if (window.confirm("Delete this song?")) {
				await deleteSong(songId);
			}
		}, 600);
	}

	function cancelLongPress() {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}

	if (songs === undefined) {
		return <div className="editor-loading">Loading…</div>;
	}

	return (
		<>
			{songs.length === 0 ? (
				<div className="library-empty">
					<span>No songs yet</span>
					<span className="library-empty-hint">Tap + to start</span>
				</div>
			) : (
				<ul className="song-list">
					{songs.map((song) => (
						<li
							key={song.id}
							className="song-row"
							onClick={() => {
								if (!didLongPress.current) goToEditor(song.id);
							}}
							onMouseDown={() => startLongPress(song.id)}
							onMouseUp={cancelLongPress}
							onMouseLeave={cancelLongPress}
							onTouchStart={() => startLongPress(song.id)}
							onTouchEnd={cancelLongPress}
							onTouchCancel={cancelLongPress}
						>
							<span className="song-row-title">{song.title}</span>
							<span className="song-row-meta">
								{song.key} {song.mode} · {song.bpm} BPM
							</span>
						</li>
					))}
				</ul>
			)}
			<button className="fab" onClick={handleNew} aria-label="New song">
				+
			</button>
			<button
				className="library-import-btn"
				onClick={() => setShowImport(true)}
				aria-label="Import ChordPro"
			>
				Import
			</button>

			{showImport && (
				<ImportSheet
					onImport={handleImport}
					onClose={() => setShowImport(false)}
				/>
			)}
		</>
	);
}
