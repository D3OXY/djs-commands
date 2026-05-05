import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	server: {
		port: 3002,
	},
	optimizeDeps: {
		exclude: ["source.generated"],
	},
	plugins: [
		mdx(await import("./source.config")),
		tailwindcss(),
		tsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tanstackStart({
			prerender: {
				enabled: true,
			},
		}),
		// Nitro takes the Vite build output and produces a Vercel Build Output
		// API v3 directory at .vercel/output/, which Vercel auto-handles. The
		// `preset: "vercel"` is explicit so local builds match CI; the `nitro`
		// version is pinned to the beta paired with the current TanStack Start
		// (stable nitro@3.0.0 is incompatible).
		nitro({ preset: "vercel" }),
	],
});
