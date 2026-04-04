import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { ChordPanel } from "./ChordPanel";

interface Props {
	songId: string;
}

export function EditorScreen({ songId }: Props) {
	const song = useLiveQuery(() => db.songs.get(songId), [songId]);

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
			</div>
			<ChordPanel song={song} />
		</div>
	);
}
