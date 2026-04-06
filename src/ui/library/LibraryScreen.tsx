import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db } from "../../data/db";
import { addSong, deleteSong, updateSong } from "../../data/songRepo";
import { useNavStore } from "../../app/nav";
import type { ChordProImport } from "../../data/chordpro";
import { Button } from "@/components/ui/button";
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
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				Loading…
			</div>
		);
	}

	return (
		<>
			{songs.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
					<span className="text-base">No songs yet</span>
					<span className="text-sm">Tap + to start</span>
				</div>
			) : (
				<ul className="divide-y divide-border">
					{songs.map((song) => (
						<li
							key={song.id}
							className="flex flex-col px-4 py-3 cursor-pointer select-none active:bg-muted"
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
							<span className="text-base font-medium text-foreground">
								{song.title}
							</span>
							<span className="text-sm text-muted-foreground">
								{song.key} {song.mode} · {song.bpm} BPM
							</span>
						</li>
					))}
				</ul>
			)}

			{/* FAB */}
			<Button
				className="fixed bottom-6 right-6 size-14 rounded-full shadow-lg text-2xl"
				onClick={handleNew}
				aria-label="New song"
			>
				+
			</Button>

			<Button
				variant="outline"
				className="fixed bottom-6 right-24"
				onClick={() => setShowImport(true)}
				aria-label="Import ChordPro"
			>
				Import
			</Button>

			<ImportSheet
				open={showImport}
				onImport={handleImport}
				onClose={() => setShowImport(false)}
			/>
		</>
	);
}
