import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { ChordPanel } from "./ChordPanel";
import { ScoreView } from "./ScoreView";
import { SongSettingsSheet } from "./SongSettingsSheet";
import { LyricsSheet } from "./LyricsSheet";
import { ExportSheet } from "./ExportSheet";
import { usePlayerStore } from "../../audio/playerStore";
import type { CurrentContext } from "./types";

interface Props {
	songId: string;
}

export function EditorScreen({ songId }: Props) {
	const song = useLiveQuery(() => db.songs.get(songId), [songId]);
	const [currentContext, setCurrentContext] = useState<CurrentContext>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [showLyrics, setShowLyrics] = useState(false);
	const [showExport, setShowExport] = useState(false);

	const playerStore = usePlayerStore();
	const isPlaying = playerStore.state === "playing";
	const isLoading = playerStore.isLoading;

	const handlePlayStop = useCallback(async () => {
		if (!song) return;
		if (isPlaying) {
			playerStore.stop();
			return;
		}
		if (currentContext?.type === "bar") {
			const sec = song.sections.find((s) => s.id === currentContext.sectionId);
			const part = sec?.parts.find((p) => p.id === currentContext.partId);
			const bar = part?.bars.find((b) => b.id === currentContext.barId);
			if (sec && part && bar) {
				await playerStore.play({
					...song,
					sections: [
						{ ...sec, parts: [{ ...part, bars: [bar], repeatCount: 1 }] },
					],
				});
				return;
			}
		} else if (currentContext?.type === "section") {
			const sec = song.sections.find((s) => s.id === currentContext.sectionId);
			if (sec) {
				await playerStore.play({ ...song, sections: [sec] });
				return;
			}
		}
		await playerStore.play(song);
	}, [song, isPlaying, currentContext, playerStore]);

	if (song === undefined) return <div className="editor-loading">Loading…</div>;
	if (song === null)
		return <div className="editor-loading">Song not found.</div>;

	let playLabel = "▶ Play";
	if (isLoading) playLabel = "Loading…";
	else if (isPlaying) playLabel = "■ Stop";
	else if (currentContext?.type === "bar") playLabel = "▶ Play bar";
	else if (currentContext?.type === "section") {
		const name = song.sections.find(
			(s) => s.id === currentContext.sectionId,
		)?.name;
		if (name) playLabel = `▶ Play ${name}`;
	}

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
					currentContext={currentContext}
					onContextChange={setCurrentContext}
				/>
			</div>

			<ChordPanel
				song={song}
				currentContext={currentContext}
				onContextChange={setCurrentContext}
			/>

			<div className="editor-play-bar">
				<button
					className={[
						"editor-play-bar-btn",
						isPlaying ? "editor-play-bar-btn--playing" : "",
					]
						.filter(Boolean)
						.join(" ")}
					onClick={handlePlayStop}
					disabled={isLoading}
				>
					{playLabel}
				</button>
			</div>

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
