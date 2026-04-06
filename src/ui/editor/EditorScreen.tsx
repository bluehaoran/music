import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { ChordPanel } from "./ChordPanel";
import { ScoreView } from "./ScoreView";
import { SongSettingsSheet } from "./SongSettingsSheet";
import { LyricsSheet } from "./LyricsSheet";
import { ExportSheet } from "./ExportSheet";
import { usePlayerStore } from "../../audio/playerStore";
import { updateSong } from "../../data/songRepo";
import { patternsForTimeSig } from "../../audio/drums";
import type { TimeSignature } from "../../theory/model";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CurrentContext } from "./types";

const TIME_SIGS: TimeSignature[] = [
	{ numerator: 4, denominator: 4 },
	{ numerator: 3, denominator: 4 },
	{ numerator: 6, denominator: 8 },
	{ numerator: 2, denominator: 4 },
];

const INSTRUMENTS = ["guitar", "piano"] as const;

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

	const handleCycleInstrument = useCallback(async () => {
		if (!song) return;
		const idx = INSTRUMENTS.indexOf(song.instrument);
		const next = INSTRUMENTS[(idx + 1) % INSTRUMENTS.length];
		await updateSong(song.id, { instrument: next });
	}, [song]);

	const handleCycleTimeSig = useCallback(async () => {
		if (!song) return;
		const idx = TIME_SIGS.findIndex(
			(ts) =>
				ts.numerator === song.timeSignature.numerator &&
				ts.denominator === song.timeSignature.denominator,
		);
		const next = TIME_SIGS[(idx + 1) % TIME_SIGS.length];
		// Reset drum pattern if incompatible
		const compatible = patternsForTimeSig(next);
		const drumPatternId =
			song.drumPatternId && !compatible.find((p) => p.id === song.drumPatternId)
				? null
				: song.drumPatternId;
		await updateSong(song.id, { timeSignature: next, drumPatternId });
	}, [song]);

	const handleCycleDrums = useCallback(async () => {
		if (!song) return;
		const patterns = patternsForTimeSig(song.timeSignature);
		// Cycle: null → patterns[0] → patterns[1] → … → null
		if (song.drumPatternId === null) {
			await updateSong(song.id, { drumPatternId: patterns[0]?.id ?? null });
		} else {
			const idx = patterns.findIndex((p) => p.id === song.drumPatternId);
			const next = idx + 1 < patterns.length ? patterns[idx + 1].id : null;
			await updateSong(song.id, { drumPatternId: next });
		}
	}, [song]);

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

	if (song === undefined)
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				Loading…
			</div>
		);
	if (song === null)
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				Song not found.
			</div>
		);

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
		<div className="flex flex-col h-full">
			{/* Meta chips */}
			<div className="flex items-center gap-1.5 px-3 py-2 flex-wrap border-b border-border">
				<Badge variant="secondary">{song.bpm} BPM</Badge>
				<Badge
					variant="secondary"
					className="cursor-pointer select-none"
					onClick={handleCycleTimeSig}
				>
					{song.timeSignature.numerator}/{song.timeSignature.denominator}
				</Badge>
				<Badge
					variant="secondary"
					className="cursor-pointer select-none capitalize"
					onClick={handleCycleInstrument}
				>
					{song.instrument}
				</Badge>
				{song.capo > 0 && <Badge variant="secondary">capo {song.capo}</Badge>}
				<Badge
					variant={song.drumPatternId ? "outline" : "secondary"}
					className={[
						"cursor-pointer select-none",
						song.drumPatternId
							? "text-primary border-primary/40"
							: "opacity-40",
					].join(" ")}
					onClick={handleCycleDrums}
				>
					{song.drumPatternId
						? `Drums: ${patternsForTimeSig(song.timeSignature).find((p) => p.id === song.drumPatternId)?.name ?? "Drums"}`
						: "Drums"}
				</Badge>
				<div className="flex-1" />
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setShowLyrics(true)}
					aria-label="Edit lyrics"
				>
					♪
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setShowSettings(true)}
					aria-label="Song settings"
				>
					⚙
				</Button>
			</div>

			{/* Score */}
			<div className="flex-1 overflow-y-auto">
				<ScoreView
					song={song}
					currentContext={currentContext}
					onContextChange={setCurrentContext}
				/>
			</div>

			{/* Chord panel */}
			<ChordPanel
				song={song}
				currentContext={currentContext}
				onContextChange={setCurrentContext}
			/>

			{/* Play bar */}
			<div className="p-3 border-t border-border">
				<Button
					className="w-full h-12 text-base font-semibold"
					variant={isPlaying ? "secondary" : "default"}
					onClick={handlePlayStop}
					disabled={isLoading}
				>
					{playLabel}
				</Button>
			</div>

			<SongSettingsSheet
				song={song}
				open={showSettings}
				onClose={() => setShowSettings(false)}
				onExport={() => {
					setShowSettings(false);
					setShowExport(true);
				}}
			/>
			<ExportSheet
				song={song}
				open={showExport}
				onClose={() => setShowExport(false)}
			/>
			<LyricsSheet
				song={song}
				open={showLyrics}
				onClose={() => setShowLyrics(false)}
			/>
		</div>
	);
}
