import { existsSync, type FSWatcher, watch } from "node:fs";
import { readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { EventDefinition } from "./define-event";
import type { AnyCommand } from "./types";

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cjs"]);

interface DirEntry {
	name: string;
	isDirectory(): boolean;
	isFile(): boolean;
}

/** Command discovered from a file-system command directory. */
export interface CommandFileEntry {
	/** Absolute file path that produced the command. */
	file: string;
	/** Command exported from the file. */
	command: AnyCommand;
}

async function* walk(dir: string): AsyncIterable<string> {
	let entries: DirEntry[];
	try {
		entries = (await readdir(dir, { withFileTypes: true })) as unknown as DirEntry[];
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			yield* walk(full);
		} else if (entry.isFile() && SOURCE_EXTS.has(extname(entry.name))) {
			yield full;
		}
	}
}

function isCommand(v: unknown): v is AnyCommand {
	if (!v || typeof v !== "object") return false;
	const c = v as Record<string, unknown>;
	return typeof c.name === "string" && typeof c.description === "string" && typeof c.run === "function";
}

function isEvent(v: unknown): v is EventDefinition {
	if (!v || typeof v !== "object") return false;
	const e = v as Record<string, unknown>;
	return typeof e.event === "string" && typeof e.handler === "function";
}

async function importModule(file: string, cacheBust?: number): Promise<unknown> {
	const baseUrl = pathToFileURL(file).href;
	const url = cacheBust !== undefined ? `${baseUrl}?v=${cacheBust}` : baseUrl;
	const mod = (await import(url)) as Record<string, unknown>;
	return mod.default ?? mod.command ?? mod.event ?? null;
}

/** Loads command default exports from every source file under a directory. */
export async function loadCommandsFromDir(dir: string): Promise<AnyCommand[]> {
	const entries = await loadCommandEntriesFromDir(dir);
	return entries.map((entry) => entry.command);
}

/** Loads command exports with source file paths, used by hot reload bookkeeping. */
export async function loadCommandEntriesFromDir(dir: string): Promise<CommandFileEntry[]> {
	const absolute = resolve(dir);
	const entries: CommandFileEntry[] = [];
	for await (const file of walk(absolute)) {
		const candidate = await importModule(file);
		if (isCommand(candidate)) entries.push({ file, command: candidate });
	}
	return entries;
}

/** Loads `defineEvent` exports from every source file under a directory. */
export async function loadEventsFromDir(dir: string): Promise<EventDefinition[]> {
	const absolute = resolve(dir);
	const events: EventDefinition[] = [];
	for await (const file of walk(absolute)) {
		const candidate = await importModule(file);
		if (isEvent(candidate)) events.push(candidate);
	}
	return events;
}

/** Handle for stopping a file-system watcher. */
export interface WatchHandle {
	/** Stops watching and releases the underlying file-system watcher. */
	stop: () => void;
}

/**
 * Watches a directory recursively for source-file changes and re-imports them
 * with cache-busting query strings. Each callback fires after a successful
 * re-import; the command may be `null` if the file was deleted or no longer
 * exports a valid command.
 */
export function watchCommandsDir(dir: string, options: { onCommandChange?: (file: string, command: AnyCommand | null) => void }): WatchHandle {
	const absolute = resolve(dir);
	let watcher: FSWatcher;
	try {
		watcher = watch(absolute, { recursive: true }, (_event, filename) => {
			if (!filename) return;
			if (!SOURCE_EXTS.has(extname(filename))) return;
			const file = join(absolute, filename);
			if (!existsSync(file)) {
				options.onCommandChange?.(file, null);
				return;
			}
			importModule(file, Date.now())
				.then((candidate) => {
					if (isCommand(candidate)) {
						options.onCommandChange?.(file, candidate);
					} else {
						options.onCommandChange?.(file, null);
					}
				})
				.catch((err) => {
					console.error(`[djs-commands] Failed to hot-reload ${file}:`, err);
				});
		});
	} catch (err) {
		console.error(`[djs-commands] Could not watch ${absolute}:`, err);
		return { stop: () => {} };
	}
	return { stop: () => watcher.close() };
}
