import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCommandEntriesFromDir, loadCommandsFromDir, loadEventsFromDir } from "./fs-loader";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "djs-commands-fs-loader-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

const PING_SOURCE = `
export default {
	name: "ping",
	description: "Replies with pong",
	run: async () => {},
};
`;

const ECHO_SOURCE = `
export default {
	name: "echo",
	description: "Echoes",
	run: async () => {},
};
`;

const NOT_A_COMMAND = `
export default { foo: "bar" };
`;

const NAMED_EXPORT = `
export const command = {
	name: "kick",
	description: "Kick",
	run: async () => {},
};
`;

const READY_EVENT = `
export default {
	event: "clientReady",
	once: true,
	handler: () => {},
};
`;

test("loadCommandsFromDir picks up files whose default export is a Command", async () => {
	await writeFile(join(dir, "ping.ts"), PING_SOURCE);
	await writeFile(join(dir, "echo.ts"), ECHO_SOURCE);

	const commands = await loadCommandsFromDir(dir);

	const names = commands.map((c) => c.name).sort();
	expect(names).toEqual(["echo", "ping"]);
});

test("loadCommandEntriesFromDir includes source file paths", async () => {
	const file = join(dir, "ping.ts");
	await writeFile(file, PING_SOURCE);

	const entries = await loadCommandEntriesFromDir(dir);

	expect(entries).toEqual([{ file, command: expect.objectContaining({ name: "ping" }) }]);
});

test("loadCommandsFromDir walks subdirectories recursively", async () => {
	await mkdir(join(dir, "moderation"), { recursive: true });
	await writeFile(join(dir, "moderation", "ping.ts"), PING_SOURCE);
	await writeFile(join(dir, "echo.ts"), ECHO_SOURCE);

	const commands = await loadCommandsFromDir(dir);

	expect(commands.map((c) => c.name).sort()).toEqual(["echo", "ping"]);
});

test("loadCommandsFromDir ignores files that don't export a valid command", async () => {
	await writeFile(join(dir, "ping.ts"), PING_SOURCE);
	await writeFile(join(dir, "not-a-command.ts"), NOT_A_COMMAND);

	const commands = await loadCommandsFromDir(dir);

	expect(commands.map((c) => c.name)).toEqual(["ping"]);
});

test("loadCommandsFromDir falls back to a `command` named export when no default", async () => {
	await writeFile(join(dir, "kick.ts"), NAMED_EXPORT);

	const commands = await loadCommandsFromDir(dir);

	expect(commands.map((c) => c.name)).toEqual(["kick"]);
});

test("loadCommandsFromDir returns an empty array when the directory doesn't exist", async () => {
	const commands = await loadCommandsFromDir(join(dir, "does-not-exist"));
	expect(commands).toEqual([]);
});

test("loadCommandsFromDir ignores non-source files (e.g. .json, .md)", async () => {
	await writeFile(join(dir, "ping.ts"), PING_SOURCE);
	await writeFile(join(dir, "config.json"), '{"foo": "bar"}');
	await writeFile(join(dir, "README.md"), "# commands");

	const commands = await loadCommandsFromDir(dir);

	expect(commands.map((c) => c.name)).toEqual(["ping"]);
});

test("loadEventsFromDir picks up files whose default export is an EventDefinition", async () => {
	await writeFile(join(dir, "ready.ts"), READY_EVENT);

	const events = await loadEventsFromDir(dir);

	expect(events).toHaveLength(1);
	expect(events[0]?.event).toBe("clientReady");
	expect(events[0]?.once).toBe(true);
});

test("loadEventsFromDir ignores command-shaped files", async () => {
	await writeFile(join(dir, "ping.ts"), PING_SOURCE);
	await writeFile(join(dir, "ready.ts"), READY_EVENT);

	const events = await loadEventsFromDir(dir);

	expect(events).toHaveLength(1);
	expect(events[0]?.event).toBe("clientReady");
});
