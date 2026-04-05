import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import type { Bar } from "../../theory/model";
import { ChordPanel } from "./ChordPanel";
import { ScoreView } from "./ScoreView";
import { BarEditSheet } from "./BarEditSheet";
import { SongSettingsSheet } from "./SongSettingsSheet";
import { LyricsSheet } from "./LyricsSheet";
import { ExportSheet } from "./ExportSheet";
import { usePlayerStore } from "../../audio/playerStore";

interface Props {
	songId: string;
}

interface EditTarget {
	sectionId: string;
	partId: string;
	bar: Bar;
}

export function EditorScreen({ songId }: Props) {
	const song = useLiveQuery(() => db.songs.get(songId), [songId]);
	const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [showLyrics, setShowLyrics] = useState(false);
	const [showExport, setShowExport] = useState(false);
	const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

	const playerStore = usePlayerStore();
	const isPlaying = playerStore.state === "playing";
	const isLoading = playerStore.isLoading;

	const handleSetCurrentSection = useCallback((sectionId: string) => {
		setCurrentSectionId((prev) => (prev === sectionId ? prev : sectionId));
	}, []);

	const handlePlayStop = useCallback(async () => {
		if (!song) return;
		if (isPlaying) {
			playerStore.stop();
			return;
		}
		if (currentSectionId) {
			const section = song.sections.find((s) => s.id === currentSectionId);
			if (section) {
				await playerStore.play({ ...song, sections: [section] });
				return;
			}
		}
		await playerStore.play(song);
	}, [song, isPlaying, currentSectionId, playerStore]);

	if (song === undefined) {
		return <div className="editor-loading">Loading…</div>;
	}

	if (song === null) {
		return <div className="editor-loading">Song not found.</div>;
	}

	const currentSectionName = currentSectionId
		? (song.sections.find((s) => s.id === currentSectionId)?.name ?? null)
		: null;

	return (
		<div className="editor-root">
			<div className="editor-meta">
				<span className="editor-meta-chip">{song.bpm} BPM</span>
				<span className="editor-meta-chip">
					{song.timeSignature.numerator}/{song.timeSignature.denominator}
				</span>
				<span className="editor-meta-chip">{song.instrument}</span>
				{song.capo > 0 && (
					<span className="editor-meta-chip">capo {song.capo}</span>
				)}
				{song.drumPatternId && (
					<span className="editor-meta-chip editor-meta-chip--drum">drums</span>
				)}

				{/* Contextual play button */}
				<button
					className={[
						"editor-play-btn",
						isPlaying ? "editor-play-btn--playing" : "",
					]
						.filter(Boolean)
						.join(" ")}
					onClick={handlePlayStop}
					disabled={isLoading}
					aria-label={
						isPlaying
							? "Stop"
							: currentSectionName
								? `Play ${currentSectionName}`
								: "Play song"
					}
					title={
						isPlaying
							? "Stop"
							: currentSectionName
								? `Play ${currentSectionName}`
								: "Play song"
					}
				>
					{isLoading ? "…" : isPlaying ? "■" : "▶"}
					{!isPlaying && currentSectionName && (
						<span className="editor-play-btn-context">
							{currentSectionName}
						</span>
					)}
				</button>

				<button
					className="editor-lyrics-btn"
					onClick={() => setShowLyrics(true)}
					aria-label="Edit lyrics"
				>
					♪
				</button>
				<button
					className="editor-settings-btn"
					onClick={() => setShowSettings(true)}
					aria-label="Song settings"
				>
					⚙
				</button>
			</div>

			<div className="editor-score">
				<ScoreView
					song={song}
					onEditBar={(sectionId, partId, bar) =>
						setEditTarget({ sectionId, partId, bar })
					}
					currentSectionId={currentSectionId}
					onSetCurrentSection={handleSetCurrentSection}
				/>
			</div>

			<ChordPanel song={song} currentSectionId={currentSectionId} />

			{editTarget && (
				<BarEditSheet
					bar={editTarget.bar}
					song={song}
					sectionId={editTarget.sectionId}
					partId={editTarget.partId}
					onClose={() => setEditTarget(null)}
				/>
			)}

			{showSettings && (
				<SongSettingsSheet
					song={song}
					onClose={() => setShowSettings(false)}
					onExport={() => {
						setShowSettings(false);
						setShowExport(true);
					}}
				/>
			)}

			{showExport && (
				<ExportSheet song={song} onClose={() => setShowExport(false)} />
			)}

			{showLyrics && (
				<LyricsSheet song={song} onClose={() => setShowLyrics(false)} />
			)}
		</div>
	);
}
