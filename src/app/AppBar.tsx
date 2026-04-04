import { useLiveQuery } from "dexie-react-hooks";
import { useRef } from "react";
import { db } from "../data/db";
import { updateSong } from "../data/songRepo";
import { useNavStore } from "./nav";

export function AppBar() {
	const screen = useNavStore((s) => s.screen);
	const goToLibrary = useNavStore((s) => s.goToLibrary);

	if (screen.id === "library") {
		return (
			<header className="app-bar">
				<span className="app-bar-title">Unchorded</span>
			</header>
		);
	}

	return (
		<header className="app-bar">
			<button className="app-bar-back" onClick={goToLibrary} aria-label="Back">
				‹
			</button>
			<EditorTitle songId={screen.songId} />
		</header>
	);
}

function EditorTitle({ songId }: { songId: string }) {
	const song = useLiveQuery(() => db.songs.get(songId), [songId]);
	const inputRef = useRef<HTMLInputElement>(null);

	if (!song) return <span className="app-bar-title"> </span>;

	return (
		<input
			ref={inputRef}
			className="app-bar-title-input"
			defaultValue={song.title}
			key={song.title}
			aria-label="Song title"
			onBlur={(e) => {
				const trimmed = e.target.value.trim();
				if (trimmed && trimmed !== song.title) {
					updateSong(songId, { title: trimmed });
				} else {
					e.target.value = song.title;
				}
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") e.currentTarget.blur();
				if (e.key === "Escape") {
					e.currentTarget.value = song.title;
					e.currentTarget.blur();
				}
			}}
		/>
	);
}
