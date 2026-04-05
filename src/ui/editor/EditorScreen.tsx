import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import type { Bar } from "../../theory/model";
import { ChordPanel } from "./ChordPanel";
import { ScoreView } from "./ScoreView";
import { BarEditSheet } from "./BarEditSheet";
import { SongSettingsSheet } from "./SongSettingsSheet";
import { LyricsSheet } from "./LyricsSheet";
import { ExportSheet } from "./ExportSheet";

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

	if (song === undefined) {
		return <div className="editor-loading">Loading…</div>;
	}

	if (song === null) {
		return <div className="editor-loading">Song not found.</div>;
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
					onEditBar={(sectionId, partId, bar) =>
						setEditTarget({ sectionId, partId, bar })
					}
				/>
			</div>

			<ChordPanel song={song} />

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
					onExport={() => { setShowSettings(false); setShowExport(true); }}
				/>
			)}

			{showExport && (
				<ExportSheet song={song} onClose={() => setShowExport(false)} />
			)}

			{showLyrics && (
				<LyricsSheet
					song={song}
					onClose={() => setShowLyrics(false)}
				/>
			)}
		</div>
	);
}
