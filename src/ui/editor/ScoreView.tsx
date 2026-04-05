/**
 * ScoreView.tsx
 * Arrangement display — shows the song's section/part/bar hierarchy.
 *
 * Clicking a section name selects it (and opens rename).
 * Clicking a bar selects it as the current editing context.
 * Each section header shows a repeat-count control (×, ×2, ×3, ×4).
 * The currently playing bar is highlighted via playerStore.
 */

import { useMemo, useRef, useState } from "react";
import { chordLabel } from "../../theory/chords";
import type { Bar, Song } from "../../theory/model";
import { usePlayerStore } from "../../audio/playerStore";
import {
	addSection as addSectionRepo,
	removeSection as removeSectionRepo,
	renameSection as renameSectionRepo,
	updatePartRepeatCount,
} from "../../data/songRepo";
import type { CurrentContext } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
	song: Song;
	currentContext: CurrentContext;
	onContextChange: (ctx: CurrentContext) => void;
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
					refs.push({
						sectionId: sec.id,
						partId: part.id,
						barId: bar.id,
						globalIndex: idx++,
					});
				}
			}
		}
	}
	return refs;
}

const SECTION_NAMES = [
	"Verse",
	"Chorus",
	"Bridge",
	"Intro",
	"Outro",
	"Interlude",
];

// ─── RepeatControl ────────────────────────────────────────────────────────────

function RepeatControl({
	count,
	onChange,
}: {
	count: number;
	onChange: (n: number) => void;
}) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLongRef = useRef(false);

	function onDown() {
		didLongRef.current = false;
		timerRef.current = setTimeout(() => {
			didLongRef.current = true;
			if (count > 1 && window.confirm("Remove repeat?")) onChange(1);
		}, 500);
	}

	function onUp() {
		if (timerRef.current) clearTimeout(timerRef.current);
		if (!didLongRef.current) {
			onChange(count >= 4 ? 1 : count + 1);
		}
	}

	function onCancel() {
		if (timerRef.current) clearTimeout(timerRef.current);
		didLongRef.current = false;
	}

	return (
		<button
			className={[
				"score-repeat-btn",
				count > 1 ? "score-repeat-btn--active" : "",
			]
				.filter(Boolean)
				.join(" ")}
			onPointerDown={onDown}
			onPointerUp={onUp}
			onPointerCancel={onCancel}
			onContextMenu={(e) => e.preventDefault()}
			aria-label={`Repeat: ${count}`}
		>
			{count === 1 ? "×" : `×${count}`}
		</button>
	);
}

// ─── BarCell ──────────────────────────────────────────────────────────────────

function BarCell({
	bar,
	isPlaying,
	isSelected,
	onClick,
}: {
	bar: Bar;
	isPlaying: boolean;
	isSelected: boolean;
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
				isSelected ? "score-bar-cell--selected" : "",
				bar.slots.length === 0 ? "score-bar-cell--empty" : "",
				bar.lyric ? "score-bar-cell--has-lyric" : "",
			]
				.filter(Boolean)
				.join(" ")}
			onClick={onClick}
		>
			<span className="score-bar-chord">{label}</span>
			{bar.lyric && <span className="score-bar-lyric">{bar.lyric}</span>}
		</button>
	);
}

// ─── ScoreView ────────────────────────────────────────────────────────────────

export function ScoreView({ song, currentContext, onContextChange }: Props) {
	const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
	const [nameDraft, setNameDraft] = useState("");
	const nameInputRef = useRef<HTMLInputElement>(null);

	const currentBarIndex = usePlayerStore((s) => s.currentBarIndex);
	const playState = usePlayerStore((s) => s.state);

	const barRefs = useMemo(() => buildBarRefs(song), [song]);
	const playingRef =
		playState === "playing" ? (barRefs[currentBarIndex] ?? null) : null;

	function isBarPlaying(sectionId: string, partId: string, barId: string) {
		return (
			playingRef !== null &&
			playingRef.sectionId === sectionId &&
			playingRef.partId === partId &&
			playingRef.barId === barId
		);
	}

	function isBarSelected(barId: string) {
		return currentContext?.type === "bar" && currentContext.barId === barId;
	}

	function isSectionActive(sectionId: string) {
		return (
			(currentContext?.type === "section" &&
				currentContext.sectionId === sectionId) ||
			(currentContext?.type === "bar" && currentContext.sectionId === sectionId)
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
		if (
			currentContext?.type !== null &&
			"sectionId" in (currentContext ?? {}) &&
			(currentContext as { sectionId: string }).sectionId === sectionId
		) {
			onContextChange(null);
		}
	}

	async function commitRename(sectionId: string) {
		const name = nameDraft.trim();
		if (name) await renameSectionRepo(song.id, sectionId, name);
		setEditingSectionId(null);
	}

	function startRename(sectionId: string, currentName: string) {
		setEditingSectionId(sectionId);
		setNameDraft(currentName);
		requestAnimationFrame(() => nameInputRef.current?.focus());
	}

	if (song.sections.length === 0) {
		return (
			<div className="score-empty">
				<p>Tap chords below to build your arrangement.</p>
				<button className="score-add-section-btn" onClick={handleAddSection}>
					+ Add section
				</button>
			</div>
		);
	}

	return (
		<div className="score-view">
			{song.sections.map((section) => {
				const firstPart = section.parts[0];
				return (
					<div
						key={section.id}
						className={[
							"score-section",
							isSectionActive(section.id) ? "score-section--current" : "",
						]
							.filter(Boolean)
							.join(" ")}
					>
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
									onClick={() => {
										onContextChange({ type: "section", sectionId: section.id });
										startRename(section.id, section.name);
									}}
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
											<span className="score-empty-part">
												empty — tap chords below
											</span>
										) : (
											part.bars.map((bar) => (
												<BarCell
													key={bar.id}
													bar={bar}
													isPlaying={isBarPlaying(section.id, part.id, bar.id)}
													isSelected={isBarSelected(bar.id)}
													onClick={() =>
														onContextChange({
															type: "bar",
															sectionId: section.id,
															partId: part.id,
															barId: bar.id,
														})
													}
												/>
											))
										)}
									</div>
								</div>
							</div>
						))}

						<div className="score-section-footer">

							{/* Repeat count control (on first part) */}
							{firstPart && (
								<RepeatControl
									count={firstPart.repeatCount}
									onChange={(n) =>
										updatePartRepeatCount(song.id, section.id, firstPart.id, n)
									}
								/>
							)}

						</div>
					</div>
				);
			})}

			<button className="score-add-section-btn" onClick={handleAddSection}>
				+ Add section
			</button>
		</div>
	);
}
