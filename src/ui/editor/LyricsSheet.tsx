/**
 * LyricsSheet.tsx
 * Full-song lyrics editor using pipe | delimiters to align text to bars.
 *
 * Each section gets its own textarea. Bar lyrics are joined with " | " for
 * display and split on "|" when saving back to individual bars.
 *
 * Bars with no lyric show as empty segments. Extra segments beyond the bar
 * count are ignored; missing segments leave the bar lyric cleared.
 */

import { useState } from "react";
import type { Song } from "../../theory/model";
import { replaceBar } from "../../data/songRepo";

interface Props {
	song: Song;
	onClose: () => void;
}

/** All unique bars in a section (not accounting for repeatCount). */
function sectionBarCount(song: Song, sectionId: string): number {
	const section = song.sections.find((s) => s.id === sectionId);
	if (!section) return 0;
	return section.parts.reduce((n, p) => n + p.bars.length, 0);
}

function buildSectionText(song: Song, sectionId: string): string {
	const section = song.sections.find((s) => s.id === sectionId);
	if (!section) return "";
	const lyrics: string[] = [];
	for (const part of section.parts) {
		for (const bar of part.bars) {
			lyrics.push(bar.lyric ?? "");
		}
	}
	return lyrics.join(" | ");
}

export function LyricsSheet({ song, onClose }: Props) {
	const [texts, setTexts] = useState<Record<string, string>>(() => {
		const result: Record<string, string> = {};
		for (const section of song.sections) {
			result[section.id] = buildSectionText(song, section.id);
		}
		return result;
	});

	async function handleSave() {
		for (const section of song.sections) {
			const raw = texts[section.id] ?? "";
			const segments = raw.split("|").map((s) => s.trim());

			let barIdx = 0;
			for (const part of section.parts) {
				for (const bar of part.bars) {
					const lyric = barIdx < segments.length ? segments[barIdx] : "";
					const prev = bar.lyric ?? "";
					if (prev !== lyric) {
						await replaceBar(song.id, section.id, part.id, {
							...bar,
							lyric: lyric || undefined,
						});
					}
					barIdx++;
				}
			}
		}
		onClose();
	}

	const hasSections = song.sections.length > 0;

	return (
		<div className="lyrics-overlay" onPointerDown={onClose}>
			<div
				className="lyrics-sheet"
				onPointerDown={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="lyrics-header">
					<span className="lyrics-title">Lyrics</span>
					<button className="lyrics-close" onClick={onClose} aria-label="Close">
						×
					</button>
				</div>

				<p className="lyrics-hint">
					Separate each bar's lyric with <span className="lyrics-pipe">|</span>
				</p>

				{!hasSections ? (
					<p className="lyrics-empty">
						Add some chords to the arrangement first.
					</p>
				) : (
					song.sections.map((section) => {
						const barCount = sectionBarCount(song, section.id);
						const placeholder = Array.from(
							{ length: Math.max(barCount, 1) },
							(_, i) => (i === 0 ? "Verse one…" : "…"),
						).join(" | ");

						return (
							<div key={section.id} className="lyrics-section">
								<span className="lyrics-section-name">{section.name}</span>
								<textarea
									className="lyrics-textarea"
									value={texts[section.id] ?? ""}
									onChange={(e) =>
										setTexts((prev) => ({
											...prev,
											[section.id]: e.target.value,
										}))
									}
									placeholder={placeholder}
									rows={Math.max(2, Math.ceil(barCount / 3))}
									spellCheck
								/>
							</div>
						);
					})
				)}

				<button
					className="lyrics-save-btn"
					onClick={handleSave}
					disabled={!hasSections}
				>
					Save
				</button>
			</div>
		</div>
	);
}
