import React from "react";

export function RepeatIcon({
	size = undefined,
	color = "#000000",
	strokeWidth = 2,
	background = "transparent",
	opacity = 1,
	rotation = 0,
	shadow = 0,
	flipHorizontal = false,
	flipVertical = false,
	padding = 0,
}) {
	const transforms = [];
	if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
	if (flipHorizontal) transforms.push("scaleX(-1)");
	if (flipVertical) transforms.push("scaleY(-1)");

	const viewBoxSize = 24 + padding * 2;
	const viewBoxOffset = -padding;
	const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={viewBox}
			width={size}
			height={size}
			fill="none"
			stroke={color}
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{
				opacity,
				transform: transforms.join(" ") || undefined,
				filter:
					shadow > 0
						? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))`
						: undefined,
				backgroundColor: background !== "transparent" ? background : undefined,
			}}
		>
			<g
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={strokeWidth}
			>
				<path d="m17 2l4 4l-4 4" />
				<path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4l4-4" />
				<path d="M21 13v1a4 4 0 0 1-4 4H3m8-8h1v4" />
			</g>
		</svg>
	);
}

export default RepeatIcon;
