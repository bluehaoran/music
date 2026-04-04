import { create } from "zustand";

export type Screen = { id: "library" } | { id: "editor"; songId: string };

interface NavStore {
	screen: Screen;
	goToLibrary: () => void;
	goToEditor: (songId: string) => void;
}

export const useNavStore = create<NavStore>((set) => ({
	screen: { id: "library" },
	goToLibrary: () => set({ screen: { id: "library" } }),
	goToEditor: (songId) => set({ screen: { id: "editor", songId } }),
}));
