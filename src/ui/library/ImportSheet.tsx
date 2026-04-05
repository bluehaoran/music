/**
 * ImportSheet.tsx
 * Bottom sheet for importing a song from a ChordPro file or pasted text.
 */

import { useRef, useState } from "react";
import type { ChordProImport } from "../../data/chordpro";
import { importChordPro } from "../../data/chordpro";

interface Props {
	onImport: (data: ChordProImport) => Promise<void>;
	onClose: () => void;
}

export function ImportSheet({ onImport, onClose }: Props) {
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const content = ev.target?.result;
			if (typeof content === "string") {
				setText(content);
				setError(null);
			}
		};
		reader.readAsText(file);
		// Reset so the same file can be selected again
		e.target.value = "";
	}

	async function handleImport() {
		if (!text.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const data = importChordPro(text);
			await onImport(data);
		} catch (err) {
			setError("Could not parse — check the ChordPro format and try again.");
			setLoading(false);
		}
	}

	return (
		<div className="import-overlay" onPointerDown={onClose}>
			<div className="import-sheet" onPointerDown={(e) => e.stopPropagation()}>
				<div className="import-header">
					<span className="import-title">Import ChordPro</span>
					<button className="import-close" onClick={onClose} aria-label="Close">
						×
					</button>
				</div>
				<p className="import-hint">
					Paste ChordPro text, or open a{" "}
					<span className="import-code">.cho</span> file.
				</p>

				<textarea
					className="import-textarea"
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setError(null);
					}}
					placeholder={
						"{title: My Song}\n{key: C major}\n\n{start_of_verse: Verse}\n[C]Hello [Am]world [F]these [G7]chords\n{end_of_verse}"
					}
					rows={8}
					spellCheck={false}
				/>

				{error && <p className="import-error">{error}</p>}

				<input
					ref={fileRef}
					type="file"
					accept=".cho,.chopro,.txt"
					style={{ display: "none" }}
					onChange={handleFile}
				/>

				<div className="import-actions">
					<button
						className="import-btn import-btn--secondary"
						onClick={() => fileRef.current?.click()}
						disabled={loading}
					>
						Open File
					</button>
					<button
						className="import-btn import-btn--primary"
						onClick={handleImport}
						disabled={!text.trim() || loading}
					>
						{loading ? "Importing…" : "Import"}
					</button>
				</div>
			</div>
		</div>
	);
}
