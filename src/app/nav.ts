import { create } from "zustand";

export type HomeTab = "songs" | "drums";
export type Screen =
	| { id: "home"; tab: HomeTab }
	| { id: "editor"; songId: string };

interface NavStore {
	screen: Screen;
	goToTab: (tab: HomeTab) => void;
	goToLibrary: () => void; // alias: go home to songs tab
	goToEditor: (songId: string) => void;
}

export const useNavStore = create<NavStore>((set) => ({
	screen: { id: "home", tab: "songs" },
	goToTab: (tab) => set({ screen: { id: "home", tab } }),
	goToLibrary: () => set({ screen: { id: "home", tab: "songs" } }),
	goToEditor: (songId) => set({ screen: { id: "editor", songId } }),
}));
