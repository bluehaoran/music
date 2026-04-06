import { useLiveQuery } from "dexie-react-hooks";
import { useRef } from "react";
import { db } from "../data/db";
import { updateSong } from "../data/songRepo";
import { Button } from "@/components/ui/button";
import { useNavStore } from "./nav";

export function AppBar() {
	const screen = useNavStore((s) => s.screen);
	const goToLibrary = useNavStore((s) => s.goToLibrary);

	if (screen.id === "library") {
		return (
			<header className="h-14 flex-shrink-0 flex items-center px-4 bg-background border-b border-border sticky top-0 z-10">
				<span className="text-lg font-semibold text-foreground">Unchorded</span>
			</header>
		);
	}

	return (
		<header className="h-14 flex-shrink-0 flex items-center gap-2 px-2 bg-background border-b border-border sticky top-0 z-10">
			<Button
				variant="ghost"
				size="icon"
				onClick={goToLibrary}
				aria-label="Back"
			>
				<span className="text-2xl leading-none">‹</span>
			</Button>
			<EditorTitle songId={screen.songId} />
		</header>
	);
}

function EditorTitle({ songId }: { songId: string }) {
	const song = useLiveQuery(() => db.songs.get(songId), [songId]);
	const inputRef = useRef<HTMLInputElement>(null);

	if (!song) return <span className="flex-1" />;

	return (
		<input
			ref={inputRef}
			className="flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
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
