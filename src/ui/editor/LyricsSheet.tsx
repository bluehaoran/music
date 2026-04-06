import { useState } from "react";
import type { Song } from "../../theory/model";
import { updateBarLyrics } from "../../data/songRepo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

interface Props {
	song: Song;
	open: boolean;
	onClose: () => void;
}

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

export function LyricsSheet({ song, open, onClose }: Props) {
	const [texts, setTexts] = useState<Record<string, string>>(() => {
		const result: Record<string, string> = {};
		for (const section of song.sections) {
			result[section.id] = buildSectionText(song, section.id);
		}
		return result;
	});

	async function handleSave() {
		const updates: Record<string, string> = {};
		for (const section of song.sections) {
			const raw = texts[section.id] ?? "";
			const segments = raw.split("|").map((s) => s.trim());
			let barIdx = 0;
			for (const part of section.parts) {
				for (const bar of part.bars) {
					updates[bar.id] = barIdx < segments.length ? segments[barIdx] : "";
					barIdx++;
				}
			}
		}
		await updateBarLyrics(song.id, updates);
		onClose();
	}

	const hasSections = song.sections.length > 0;

	return (
		<Sheet
			open={open}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<SheetContent
				side="bottom"
				className="max-h-[85dvh] overflow-y-auto flex flex-col gap-4"
			>
				<SheetHeader>
					<SheetTitle>Lyrics</SheetTitle>
				</SheetHeader>

				<p className="text-sm text-muted-foreground">
					Separate each bar's lyric with{" "}
					<code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
						|
					</code>
				</p>

				{!hasSections ? (
					<p className="text-sm text-muted-foreground">
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
							<div key={section.id} className="flex flex-col gap-1.5">
								<span className="text-sm font-medium text-foreground">
									{section.name}
								</span>
								<Textarea
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
									className="resize-none"
								/>
							</div>
						);
					})
				)}

				<Button onClick={handleSave} disabled={!hasSections}>
					Save
				</Button>
			</SheetContent>
		</Sheet>
	);
}
