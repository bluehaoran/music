import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "Unchorded",
				short_name: "Unchorded",
				theme_color: "#6667AB",
				background_color: "#16171d",
				display: "standalone",
				orientation: "portrait",
				icons: [
					{
						src: "/icons/icon-192.svg",
						sizes: "192x192",
						type: "image/svg+xml",
						purpose: "any",
					},
					{
						src: "/icons/icon-512.svg",
						sizes: "512x512",
						type: "image/svg+xml",
						purpose: "maskable",
					},
				],
			},
		}),
	],
});
