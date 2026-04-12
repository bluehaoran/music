import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import type { DrumPattern, TimeSignature } from "../../theory/model";
import { BUILTIN_PATTERNS, setCustomPatterns } from "../../audio/drums";
import { DrumPatternEditor } from "../editor/DrumPatternEditor";
import { Button } from "@/components/ui/button";

function tsLabel(ts: TimeSignature) {
	return `${ts.numerator}/${ts.denominator}`;
}

const DEFAULT_TIME_SIG: TimeSignature = { numerator: 4, denominator: 4 };

export function DrumsScreen() {
	const customPatterns =
		useLiveQuery(() => db.drumPatterns.toArray(), []) ?? [];

	const [editorOpen, setEditorOpen] = useState(false);
	const [editingPattern, setEditingPattern] = useState<
		DrumPattern | undefined
	>();

	// Keep audio registry in sync whenever custom patterns change
	useEffect(() => {
		setCustomPatterns(customPatterns);
	}, [customPatterns]);

	function openNew() {
		setEditingPattern(undefined);
		setEditorOpen(true);
	}

	function openEdit(p: DrumPattern) {
		setEditingPattern(p);
		setEditorOpen(true);
	}

	return (
		<>
			{/* Built-in patterns */}
			<div className="px-4 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				Built-in
			</div>
			<ul className="divide-y divide-border">
				{BUILTIN_PATTERNS.map((p) => (
					<li key={p.id} className="flex items-center px-4 py-3 gap-3">
						<span className="flex-1 text-base font-medium text-foreground">
							{p.name}
						</span>
						<span className="text-xs text-muted-foreground">{tsLabel(p.timeSignature)}</span>
					</li>
				))}
			</ul>

			{/* Custom patterns */}
			<div className="px-4 pt-5 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
				Custom
			</div>
			{customPatterns.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-10 gap-1 text-muted-foreground">
					<span className="text-sm">No custom patterns yet</span>
					<span className="text-sm">Tap + to create one</span>
				</div>
			) : (
				<ul className="divide-y divide-border">
					{customPatterns.map((p) => (
						<li
							key={p.id}
							className="flex items-center px-4 py-3 gap-3 cursor-pointer select-none active:bg-muted"
							onClick={() => openEdit(p)}
						>
							<span className="flex-1 text-base font-medium text-foreground">
								{p.name}
							</span>
							<span className="text-xs text-muted-foreground">{tsLabel(p.timeSignature)}</span>
							<span className="text-muted-foreground">›</span>
						</li>
					))}
				</ul>
			)}

			{/* FAB */}
			<Button
				className="fixed bottom-6 right-6 size-14 rounded-full shadow-lg text-2xl"
				onClick={openNew}
				aria-label="New drum pattern"
			>
				+
			</Button>

			<DrumPatternEditor
				open={editorOpen}
				pattern={editingPattern}
				defaultTimeSig={editingPattern?.timeSignature ?? DEFAULT_TIME_SIG}
				onClose={() => setEditorOpen(false)}
				onSaved={() => setEditorOpen(false)}
				onDeleted={() => setEditorOpen(false)}
			/>
		</>
	);
}
