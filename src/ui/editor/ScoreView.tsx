/**
 * ScoreView.tsx
 * Arrangement display — shows the song's section/part/bar hierarchy.
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
import { Button } from "@/components/ui/button";
import type { CurrentContext } from "./types";
import { RepeatControl } from "./RepeatControl";

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
				"flex flex-col items-start px-2 py-1.5 rounded border text-left min-w-[56px] select-none",
				isPlaying
					? "border-primary bg-primary/20 text-primary"
					: isSelected
						? "border-primary/60 bg-primary/10"
						: "border-border bg-card hover:bg-muted",
				bar.slots.length === 0 ? "opacity-50" : "",
			]
				.filter(Boolean)
				.join(" ")}
			onClick={onClick}
		>
			<span className="text-sm font-medium leading-tight">{label}</span>
			{bar.lyric && (
				<span className="text-xs text-muted-foreground leading-tight truncate max-w-full">
					{bar.lyric}
				</span>
			)}
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
			<div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
				<p className="text-sm">Tap chords below to build your arrangement.</p>
				<Button variant="outline" size="sm" onClick={handleAddSection}>
					+ Add section
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 p-3">
			{song.sections.map((section) => {
				const firstPart = section.parts[0];
				return (
					<div
						key={section.id}
						className={[
							"rounded-lg border p-2 flex flex-col gap-2",
							isSectionActive(section.id)
								? "border-primary/50 bg-primary/5"
								: "border-border bg-card",
						].join(" ")}
					>
						{/* Section header */}
						<div className="flex items-center gap-2">
							{editingSectionId === section.id ? (
								<input
									ref={nameInputRef}
									className="flex-1 bg-transparent text-sm font-semibold outline-none border-b border-primary"
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
									className="flex-1 text-sm font-semibold text-foreground cursor-pointer"
									onClick={() => {
										onContextChange({ type: "section", sectionId: section.id });
										startRename(section.id, section.name);
									}}
								>
									{section.name}
								</span>
							)}

							<Button
								variant="ghost"
								size="icon"
								className="size-6 text-muted-foreground hover:text-destructive"
								onClick={() => handleDeleteSection(section.id)}
								aria-label="Delete section"
							>
								×
							</Button>
						</div>

						{/* Parts */}
						{section.parts.map((part) => (
							<div key={part.id} className="flex flex-wrap gap-1.5">
								{part.bars.length === 0 ? (
									<span className="text-xs text-muted-foreground italic">
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
						))}

						{/* Section footer */}
						<div className="flex justify-end gap-2">
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

			<Button
				variant="outline"
				size="sm"
				className="self-start"
				onClick={handleAddSection}
			>
				+ Add section
			</Button>
		</div>
	);
}
