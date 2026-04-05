/**
 * ScoreView.tsx
 * Arrangement display — shows the song's section/part/bar hierarchy.
 *
 * Each section has an editable name header and a delete button.
 * Each part shows bars as tappable cells in a horizontal scroll row.
 * The currently playing bar is highlighted via playerStore.
 * Tapping a bar calls onEditBar to open the BarEditSheet.
 */

import { useMemo, useRef, useState } from "react";
import { chordLabel } from "../../theory/chords";
import type { Bar, Song } from "../../theory/model";
import { usePlayerStore } from "../../audio/playerStore";
import {
	addSection as addSectionRepo,
	removeSection as removeSectionRepo,
	renameSection as renameSectionRepo,
} from "../../data/songRepo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
	song: Song;
	onEditBar: (sectionId: string, partId: string, bar: Bar) => void;
}

interface BarRef {
	sectionId: string;
	partId: string;
	barId: string;
	globalIndex: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBarRefs(song: Song): BarRef[] {
	const refs: BarRef[] = [];
	let idx = 0;
	for (const sec of song.sections) {
		for (const part of sec.parts) {
			for (let rep = 0; rep < part.repeatCount; rep++) {
				for (const bar of part.bars) {
					refs.push({ sectionId: sec.id, partId: part.id, barId: bar.id, globalIndex: idx++ });
				}
			}
		}
	}
	return refs;
}

const SECTION_NAMES = ["Verse", "Chorus", "Bridge", "Intro", "Outro", "Interlude"];

// ─── BarCell ──────────────────────────────────────────────────────────────────

function BarCell({
	bar,
	isPlaying,
	onClick,
}: {
	bar: Bar;
	isPlaying: boolean;
	onClick: () => void;
}) {
	const label =
		bar.slots.length === 0
			? "?"
			: bar.slots.map((s) => chordLabel(s.chord)).join("·");

	return (
		<button
			className={[
				"score-bar-cell",
				isPlaying ? "score-bar-cell--playing" : "",
				bar.slots.length === 0 ? "score-bar-cell--empty" : "",
				bar.lyric ? "score-bar-cell--has-lyric" : "",
			]
				.filter(Boolean)
				.join(" ")}
			onClick={onClick}
		>
			<span className="score-bar-chord">{label}</span>
			{bar.lyric && (
				<span className="score-bar-lyric">{bar.lyric}</span>
			)}
		</button>
	);
}

// ─── ScoreView ────────────────────────────────────────────────────────────────

export function ScoreView({ song, onEditBar }: Props) {
	const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
	const [nameDraft, setNameDraft] = useState("");
	const nameInputRef = useRef<HTMLInputElement>(null);

	const currentBarIndex = usePlayerStore((s) => s.currentBarIndex);
	const playState = usePlayerStore((s) => s.state);

	const barRefs = useMemo(() => buildBarRefs(song), [song]);
	const playingRef = playState === "playing" ? barRefs[currentBarIndex] ?? null : null;

	function isBarPlaying(sectionId: string, partId: string, barId: string) {
		return (
			playingRef !== null &&
			playingRef.sectionId === sectionId &&
			playingRef.partId === partId &&
			playingRef.barId === barId
		);
	}

	async function handleAddSection() {
		const existing = new Set(song.sections.map((s) => s.name));
		const name =
			SECTION_NAMES.find((n) => !existing.has(n)) ??
			`Section ${song.sections.length + 1}`;
		await addSectionRepo(song.id, name);
	}

	async function handleDeleteSection(sectionId: string) {
		if (!window.confirm("Delete this section and all its bars?")) return;
		await removeSectionRepo(song.id, sectionId);
	}

	async function commitRename(sectionId: string) {
		const name = nameDraft.trim();
		if (name) await renameSectionRepo(song.id, sectionId, name);
		setEditingSectionId(null);
	}

	function startRename(sectionId: string, currentName: string) {
		setEditingSectionId(sectionId);
		setNameDraft(currentName);
		// focus after render
		requestAnimationFrame(() => nameInputRef.current?.focus());
	}

	if (song.sections.length === 0) {
		return (
			<div className="score-empty">
				<p>
					Tap chords above and hit <strong>Save ↑</strong> to build your
					arrangement.
				</p>
				<button className="score-add-section-btn" onClick={handleAddSection}>
					+ Add section
				</button>
			</div>
		);
	}

	return (
		<div className="score-view">
			{song.sections.map((section) => (
				<div key={section.id} className="score-section">
					{/* Section header */}
					<div className="score-section-header">
						{editingSectionId === section.id ? (
							<input
								ref={nameInputRef}
								className="score-section-name-input"
								value={nameDraft}
								onChange={(e) => setNameDraft(e.target.value)}
								onBlur={() => commitRename(section.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter") commitRename(section.id);
									if (e.key === "Escape") setEditingSectionId(null);
								}}
							/>
						) : (
							<span
								className="score-section-name"
								onClick={() => startRename(section.id, section.name)}
							>
								{section.name}
							</span>
						)}
						<button
							className="score-section-delete"
							onClick={() => handleDeleteSection(section.id)}
							aria-label="Delete section"
						>
							×
						</button>
					</div>

					{/* Parts */}
					{section.parts.map((part) => (
						<div key={part.id} className="score-part">
							<div className="score-bars-scroll">
								<div className="score-bars">
									{part.bars.length === 0 ? (
										<span className="score-empty-part">empty — save chords above</span>
									) : (
										part.bars.map((bar) => (
											<BarCell
												key={bar.id}
												bar={bar}
												isPlaying={isBarPlaying(section.id, part.id, bar.id)}
												onClick={() => onEditBar(section.id, part.id, bar)}
											/>
										))
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			))}

			<button className="score-add-section-btn" onClick={handleAddSection}>
				+ Add section
			</button>
		</div>
	);
}
