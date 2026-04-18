import { useLiveQuery } from "dexie-react-hooks";
import { useRef } from "react";
import { db } from "../data/db";
import { deleteSong, updateSong } from "../data/songRepo";
import { Button } from "@/components/ui/button";
import { type HomeTab, useNavStore } from "./nav";

interface Props {
	onImportClick?: () => void;
}

const HOME_TABS: { id: HomeTab; label: string }[] = [
	{ id: "songs", label: "Songs" },
	{ id: "drums", label: "Drums" },
];

export function AppBar({ onImportClick }: Props) {
	const screen = useNavStore((s) => s.screen);
	const goToTab = useNavStore((s) => s.goToTab);
	const goToLibrary = useNavStore((s) => s.goToLibrary);

	if (screen.id === "home") {
		return (
			<header className="h-14 flex-shrink-0 flex items-center px-3 gap-2 bg-background border-b border-border">
				<span className="text-base font-semibold text-foreground shrink-0">
					Unchorded
				</span>
				<div className="flex-1 flex justify-center">
					<div className="flex rounded-lg border border-border overflow-hidden">
						{HOME_TABS.map(({ id, label }) => (
							<button
								key={id}
								className={[
									"px-5 py-1.5 text-sm",
									screen.tab === id
										? "bg-primary text-primary-foreground"
										: "bg-muted/40 text-foreground",
								].join(" ")}
								onClick={() => goToTab(id)}
							>
								{label}
							</button>
						))}
					</div>
				</div>
				{screen.tab === "songs" && onImportClick && (
					<button
						className="text-sm text-muted-foreground hover:text-foreground shrink-0"
						onClick={onImportClick}
					>
						Import
					</button>
				)}
			</header>
		);
	}

	async function handleBack() {
		const songId = (screen as Extract<typeof screen, { id: "editor" }>).songId;
		const song = await db.songs.get(songId);
		if (song) {
			const hasContent = song.sections.some((sec) =>
				sec.parts.some((p) => p.bars.some((b) => b.slots.length > 0)),
			);
			if (!hasContent) {
				await deleteSong(songId);
			}
		}
		goToLibrary();
	}

	return (
		<header className="h-14 flex-shrink-0 flex items-center gap-2 px-2 bg-background border-b border-border sticky top-0 z-10">
			<Button
				variant="ghost"
				size="icon"
				onClick={handleBack}
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
