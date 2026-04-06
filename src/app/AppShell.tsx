import { EditorScreen } from "../ui/editor/EditorScreen";
import { LibraryScreen } from "../ui/library/LibraryScreen";
import { AppBar } from "./AppBar";
import { useNavStore } from "./nav";

export function AppShell() {
	const screen = useNavStore((s) => s.screen);

	return (
		<div className="flex flex-col h-dvh overflow-hidden bg-background text-foreground">
			<AppBar />
			<main className="flex-1 overflow-y-auto">
				{screen.id === "library" && <LibraryScreen />}
				{screen.id === "editor" && <EditorScreen songId={screen.songId} />}
			</main>
		</div>
	);
}
