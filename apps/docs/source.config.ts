import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

export const docs = defineDocs({
	dir: "content/pages",
	docs: {
		// `_markdown` export on each compiled doc — used by /llms-full.txt to
		// emit a clean markdown corpus without re-reading the source files.
		postprocess: { includeProcessedMarkdown: true },
	},
});

export default defineConfig({
	/*
	 * `lastModified` reads the file's last git timestamp and exposes it on the
	 * compiled MDX module. On Vercel, set VERCEL_DEEP_CLONE=true so the build
	 * has full git history (otherwise this plugin no-ops on remote builds).
	 */
	plugins: [lastModified()],
});
