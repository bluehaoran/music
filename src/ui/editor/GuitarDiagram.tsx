/**
 * GuitarDiagram.tsx
 * SVG chord diagram showing a guitar fretboard snippet.
 *
 * String order: left = low E (string 0), right = high e (string 5).
 * Fret window: always shows 4 frets; starts at fret 1 if any fret ≤ 3,
 * otherwise starts at the minimum fret played.
 */

import type { Voicing } from "../../theory/voicings";

interface Props {
	voicing: Voicing;
	/** Optional label below the diagram (e.g. chord name). */
	label?: string;
}

const STRINGS = 6;
const FRETS = 4;
const SS = 16; // string spacing px
const FS = 18; // fret spacing px
const LM = 20; // left margin (fret label area)
const TM = 18; // top margin (x / o markers)
const DR = 5.5; // dot radius

const W = LM + (STRINGS - 1) * SS + 10;
const H = TM + FRETS * FS + 10;

function sx(i: number) {
	return LM + i * SS;
}
function fy(f: number) {
	return TM + f * FS;
} // y of fret line f (0 = nut)
function dotY(fret: number, startFret: number) {
	return TM + (fret - startFret + 0.5) * FS;
}

export function GuitarDiagram({ voicing, label }: Props) {
	const played = voicing.filter((f) => f > 0);
	const minPlayed = played.length > 0 ? Math.min(...played) : 1;
	const startFret = minPlayed <= 3 ? 1 : minPlayed;
	const showNut = startFret === 1;

	// Barre detection: if ≥4 strings span fret to fret at the min played fret
	const barreFret = minPlayed;
	const barreIndices = voicing
		.map((f, i) => ({ f, i }))
		.filter(({ f }) => f === barreFret)
		.map(({ i }) => i);
	const showBarre =
		barreIndices.length >= 4 &&
		barreIndices[barreIndices.length - 1] - barreIndices[0] >= 3 &&
		barreFret - startFret >= 0 &&
		barreFret - startFret < FRETS;

	return (
		<div className="flex flex-col items-center gap-1">
			<svg
				viewBox={`0 0 ${W} ${H}`}
				width={W}
				height={H}
				role="img"
				aria-label={label ?? "chord diagram"}
			>
				{/* Fret lines */}
				{Array.from({ length: FRETS + 1 }, (_, fi) => (
					<line
						key={fi}
						x1={sx(0)}
						y1={fy(fi)}
						x2={sx(STRINGS - 1)}
						y2={fy(fi)}
						stroke="currentColor"
						strokeOpacity={fi === 0 ? 0.65 : 0.25}
						strokeWidth={fi === 0 && showNut ? 2.5 : 0.8}
					/>
				))}

				{/* String lines */}
				{Array.from({ length: STRINGS }, (_, si) => (
					<line
						key={si}
						x1={sx(si)}
						y1={fy(0)}
						x2={sx(si)}
						y2={fy(FRETS)}
						stroke="currentColor"
						strokeOpacity={0.25}
						strokeWidth={0.8}
					/>
				))}

				{/* Fret number label when not at fret 1 */}
				{!showNut && (
					<text
						x={LM - 3}
						y={dotY(startFret, startFret) + 3}
						textAnchor="end"
						fontSize={8}
						fill="currentColor"
						opacity={0.5}
					>
						{startFret}fr
					</text>
				)}

				{/* X / O markers above nut */}
				{voicing.map((fret, si) => {
					const x = sx(si);
					const y = TM - 5;
					if (fret === -1) {
						return (
							<text
								key={si}
								x={x}
								y={y}
								textAnchor="middle"
								fontSize={9}
								fill="currentColor"
								opacity={0.55}
							>
								×
							</text>
						);
					}
					if (fret === 0) {
						return (
							<circle
								key={si}
								cx={x}
								cy={y - 1}
								r={3.5}
								fill="none"
								stroke="currentColor"
								strokeWidth={1}
								opacity={0.55}
							/>
						);
					}
					return null;
				})}

				{/* Barre bar */}
				{showBarre &&
					(() => {
						const firstStr = barreIndices[0];
						const lastStr = barreIndices[barreIndices.length - 1];
						const by = dotY(barreFret, startFret);
						return (
							<rect
								x={sx(firstStr) - DR}
								y={by - DR}
								width={sx(lastStr) - sx(firstStr) + DR * 2}
								height={DR * 2}
								rx={DR}
								fill="currentColor"
								opacity={0.85}
							/>
						);
					})()}

				{/* Finger dots */}
				{voicing.map((fret, si) => {
					if (fret <= 0) return null;
					const relFret = fret - startFret;
					if (relFret < 0 || relFret >= FRETS) return null;
					// Skip if covered by barre to avoid overlap
					if (showBarre && fret === barreFret && barreIndices.includes(si))
						return null;
					return (
						<circle
							key={si}
							cx={sx(si)}
							cy={dotY(fret, startFret)}
							r={DR}
							fill="currentColor"
							opacity={0.85}
						/>
					);
				})}
			</svg>
			{label && <div className="text-xs text-muted-foreground">{label}</div>}
		</div>
	);
}
