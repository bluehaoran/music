import { chordLabel } from "../../theory/chords";
import type { Bar } from "../../theory/model";

/**
 * This component represents one bar within a Part.
 * 
 * A bar contains 1+ chords, and will highlight as it is being played.
 */
export function BarCell({
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
				// Bars have odd border properties to make them look more like bars in a music score.
				"flex flex-col items-start px-2 py-1.5 border-t-0 border-b-0 border-r-2 text-left min-w-[56px] select-none",
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
