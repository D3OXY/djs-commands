import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
	dir: "content/pages",
	docs: {
		// `_markdown` export on each compiled doc — used by /llms-full.txt to
		// emit a clean markdown corpus without re-reading the source files.
		postprocess: { includeProcessedMarkdown: true },
	},
});

export default defineConfig();
