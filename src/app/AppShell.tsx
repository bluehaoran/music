import { useState } from "react";
import { EditorScreen } from "../ui/editor/EditorScreen";
import { LibraryScreen } from "../ui/library/LibraryScreen";
import { DrumsScreen } from "../ui/drums/DrumsScreen";
import { AppBar } from "./AppBar";
import { useNavStore } from "./nav";

export function AppShell() {
	const screen = useNavStore((s) => s.screen);
	const [showImport, setShowImport] = useState(false);

	return (
		<div className="flex flex-col h-dvh overflow-hidden bg-background text-foreground">
			<AppBar onImportClick={() => setShowImport(true)} />
			<main className="flex-1 overflow-y-auto">
				{screen.id === "home" && screen.tab === "songs" && (
					<LibraryScreen
						showImport={showImport}
						onImportClose={() => setShowImport(false)}
					/>
				)}
				{screen.id === "home" && screen.tab === "drums" && <DrumsScreen />}
				{screen.id === "editor" && <EditorScreen songId={screen.songId} />}
			</main>
		</div>
	);
}
