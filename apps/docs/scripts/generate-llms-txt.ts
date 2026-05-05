#!/usr/bin/env bun

/**
 * Generates /public/llms.txt and /public/llms-full.txt from the MDX content
 * in /content/pages. Run as part of `bun run build` (and `dev`) so both files
 * are served as static assets by Vite/Nitro — no runtime fs reads needed.
 *
 * - llms.txt        compact site index per https://llmstxt.org spec
 * - llms-full.txt   full markdown corpus, frontmatter stripped, H1 + Source: line per page
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://djscommands.deoxy.dev";
const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content/pages");
const PUBLIC_DIR = path.join(ROOT, "public");

interface Page {
	slugPath: string; // e.g. "concepts/cooldowns" or "" for root
	url: string; // e.g. "/concepts/cooldowns" or "/"
	title: string;
	description?: string;
	body: string; // mdx with frontmatter stripped
}

const SECTION_ORDER = ["", "getting-started", "concepts", "components-v2", "api-reference", "recipes", "adapter-cookbook", "migration-from-v1"];
const SECTION_TITLES: Record<string, string> = {
	"": "Overview",
	"getting-started": "Getting Started",
	concepts: "Concepts",
	"components-v2": "Components V2",
	"api-reference": "API Reference",
	recipes: "Recipes",
	"adapter-cookbook": "Adapter Cookbook",
	"migration-from-v1": "Migration from v1",
};

async function walk(dir: string): Promise<string[]> {
	const files = await readdir(dir, { withFileTypes: true });
	const result: string[] = [];
	for (const f of files) {
		const full = path.join(dir, f.name);
		if (f.isDirectory()) result.push(...(await walk(full)));
		else if (f.name.endsWith(".mdx") || f.name.endsWith(".md")) result.push(full);
	}
	return result;
}

// MDX-specific noise that's useless to an LLM trying to learn the framework:
// import statements bringing fumadocs components into scope, JSX-style
// comments, leading blank-line runs.
function stripMdxNoise(body: string): string {
	const jsxCommentPattern = /\{\/\*[\s\S]*?\*\/\}/g;
	return body
		.replace(/^import\s+[^\n]*\n/gm, "")
		.replace(jsxCommentPattern, "")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/^\n+/, "");
}

function stripFrontmatter(raw: string): { body: string; meta: Record<string, string> } {
	if (!raw.startsWith("---")) return { body: raw, meta: {} };
	const end = raw.indexOf("\n---", 3);
	if (end === -1) return { body: raw, meta: {} };
	const block = raw.slice(3, end);
	const body = raw.slice(end + 4).replace(/^\r?\n/, "");
	const meta: Record<string, string> = {};
	for (const line of block.split("\n")) {
		const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
		if (m?.[1] !== undefined) meta[m[1]] = m[2]?.replace(/^["']|["']$/g, "") ?? "";
	}
	return { body, meta };
}

function fileToSlugPath(file: string): string {
	const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, "/");
	return rel
		.replace(/\.(mdx|md)$/, "")
		.replace(/\/index$/, "")
		.replace(/^index$/, "");
}

function slugPathToUrl(slugPath: string): string {
	return slugPath ? `/${slugPath}` : "/";
}

async function loadPages(): Promise<Page[]> {
	const files = await walk(CONTENT_DIR);
	const pages: Page[] = [];
	for (const file of files.sort()) {
		const raw = await readFile(file, "utf-8");
		const { body, meta } = stripFrontmatter(raw);
		const slugPath = fileToSlugPath(file);
		pages.push({
			slugPath,
			url: slugPathToUrl(slugPath),
			title: meta.title ?? (slugPath || "Home"),
			description: meta.description,
			body: stripMdxNoise(body).trim(),
		});
	}
	return pages;
}

function topSection(slugPath: string): string {
	if (!slugPath) return "";
	return slugPath.split("/")[0] ?? "";
}

function generateIndex(pages: Page[]): string {
	const grouped = new Map<string, Page[]>();
	for (const p of pages) {
		const key = topSection(p.slugPath);
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)?.push(p);
	}
	const lines = [
		"# djs-commands",
		"",
		"> Modern Discord.js command handler — TypeScript-first, Components V2 native, with pluggable persistence.",
		"",
		`Full corpus for ingestion: ${SITE_URL}/llms-full.txt`,
		"",
	];
	for (const section of SECTION_ORDER) {
		const inSection = grouped.get(section);
		if (!inSection?.length) continue;
		lines.push(`## ${SECTION_TITLES[section] ?? section}`, "");
		for (const p of inSection) {
			const desc = p.description ? `: ${p.description}` : "";
			lines.push(`- [${p.title}](${SITE_URL}${p.url})${desc}`);
		}
		lines.push("");
	}
	return `${lines.join("\n")}\n`;
}

function generateFull(pages: Page[]): string {
	const sortedPages = [...pages].sort((a, b) => {
		const sa = SECTION_ORDER.indexOf(topSection(a.slugPath));
		const sb = SECTION_ORDER.indexOf(topSection(b.slugPath));
		const sectionRank = (sa === -1 ? 999 : sa) - (sb === -1 ? 999 : sb);
		if (sectionRank !== 0) return sectionRank;
		return a.url.localeCompare(b.url);
	});

	const chunks: string[] = [
		"# djs-commands — full documentation corpus",
		"",
		"> Full markdown export of every docs page on https://djscommands.deoxy.dev. Cite back to individual pages via the `Source:` line under each page heading.",
		"",
		"---",
		"",
	];
	for (const p of sortedPages) {
		if (!p.body) continue;
		chunks.push(`# ${p.title}`, "", `Source: ${SITE_URL}${p.url}`);
		if (p.description) chunks.push("", `> ${p.description}`);
		chunks.push("", p.body, "", "---", "");
	}
	return chunks.join("\n");
}

async function main(): Promise<void> {
	const pages = await loadPages();
	await mkdir(PUBLIC_DIR, { recursive: true });
	await writeFile(path.join(PUBLIC_DIR, "llms.txt"), generateIndex(pages), "utf-8");
	await writeFile(path.join(PUBLIC_DIR, "llms-full.txt"), generateFull(pages), "utf-8");
	console.log(`[llms-txt] wrote ${pages.length} pages → public/llms.txt + public/llms-full.txt`);
}

await main();
