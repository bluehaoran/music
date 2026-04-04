import { EditorScreen } from "../ui/editor/EditorScreen";
import { LibraryScreen } from "../ui/library/LibraryScreen";
import { AppBar } from "./AppBar";
import { useNavStore } from "./nav";

export function AppShell() {
	const screen = useNavStore((s) => s.screen);

	return (
		<div className="app-shell">
			<AppBar />
			<main className="app-main">
				{screen.id === "library" && <LibraryScreen />}
				{screen.id === "editor" && <EditorScreen songId={screen.songId} />}
			</main>
		</div>
	);
}
