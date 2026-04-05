/**
 * ExportSheet.tsx
 * Bottom sheet for exporting the current song as a ChordPro file.
 * Provides Copy, Download, and (if available) Share actions.
 */

import { useState } from "react";
import type { Song } from "../../theory/model";
import { exportChordPro } from "../../data/chordpro";

interface Props {
	song: Song;
	onClose: () => void;
}

export function ExportSheet({ song, onClose }: Props) {
	const text = exportChordPro(song);
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore — user can manually select
		}
	}

	function handleDownload() {
		const blob = new Blob([text], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${song.title}.cho`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleShare() {
		try {
			await navigator.share({ title: song.title, text });
		} catch {
			// user cancelled or API unavailable
		}
	}

	const canShare = typeof navigator !== "undefined" && "share" in navigator;

	return (
		<div className="export-overlay" onPointerDown={onClose}>
			<div className="export-sheet" onPointerDown={(e) => e.stopPropagation()}>
				<div className="export-header">
					<span className="export-title">Export ChordPro</span>
					<button className="export-close" onClick={onClose} aria-label="Close">
						×
					</button>
				</div>
				<p className="export-filename">{song.title}.cho</p>

				<textarea
					className="export-textarea"
					value={text}
					readOnly
					spellCheck={false}
					rows={10}
				/>

				<div className="export-actions">
					<button
						className="export-btn export-btn--secondary"
						onClick={handleDownload}
					>
						Download
					</button>
					{canShare && (
						<button
							className="export-btn export-btn--secondary"
							onClick={handleShare}
						>
							Share
						</button>
					)}
					<button
						className="export-btn export-btn--primary"
						onClick={handleCopy}
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>
			</div>
		</div>
	);
}
