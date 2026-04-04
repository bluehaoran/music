import { useLiveQuery } from "dexie-react-hooks";
import { useRef } from "react";
import { db } from "../../data/db";
import { addSong, deleteSong } from "../../data/songRepo";
import { useNavStore } from "../../app/nav";

export function LibraryScreen() {
	const songs = useLiveQuery(() => db.songs.orderBy("updatedAt").reverse().toArray());
	const goToEditor = useNavStore((s) => s.goToEditor);

	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLongPress = useRef(false);

	async function handleNew() {
		const song = await addSong();
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
		</>
	);
}
