import { useRef } from "react";
import { RepeatIcon } from "lucide-react";

export function RepeatControl({
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
				"text-xs px-2 py-0.5 rounded border select-none",
				count > 1
					? "border-primary text-primary bg-primary/10"
					: "border-border text-muted-foreground",
			].join(" ")}
			onPointerDown={onDown}
			onPointerUp={onUp}
			onPointerCancel={onCancel}
			onContextMenu={(e) => e.preventDefault()}
			aria-label={`Repeat: ${count}`}
		>
			{count === 1 ? <RepeatIcon size={16} /> : `×${count}`}
		</button>
	);
}
