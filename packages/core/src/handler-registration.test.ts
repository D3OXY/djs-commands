import { afterEach, describe, expect, mock, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "discord.js";
import { Events } from "discord.js";
import { createCommandHandler } from "./handler";
import type { PluginManifest } from "./plugin";
import type { AnyCommand } from "./types";

interface GuildSetCall {
	guildId: string;
	data: unknown;
}

const command = (name: string): AnyCommand => ({
	name,
	description: `${name} command`,
	run: () => {},
});

const makeClient = () => {
	const emitter = new EventEmitter();
	const globalSetMock = mock(async (_data: unknown) => {});
	const guildSetCalls: GuildSetCall[] = [];
	const guildFetchMock = mock(async (guildId: string) => ({
		commands: {
			set: async (data: unknown) => {
				guildSetCalls.push({ guildId, data });
			},
		},
	}));
	const client = emitter as unknown as Client;
	const writableClient = client as unknown as {
		application: { commands: { set: typeof globalSetMock } };
		guilds: { fetch: typeof guildFetchMock };
	};
	writableClient.application = { commands: { set: globalSetMock } };
	writableClient.guilds = { fetch: guildFetchMock };
	return { client, globalSetMock, guildFetchMock, guildSetCalls };
};

const emitReady = async (client: Client): Promise<void> => {
	client.emit(Events.ClientReady, client as Client<true>);
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));
};

const namesFromData = (data: unknown): string[] => (data as { name: string }[]).map((entry) => entry.name);

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("handler registration", () => {
	test("default global sync calls the application command manager", async () => {
		const { client, globalSetMock, guildFetchMock } = makeClient();
		const handler = createCommandHandler({ client, commands: [command("ping")] });
		await handler.ready;

		await emitReady(client);

		expect(globalSetMock).toHaveBeenCalledTimes(1);
		expect(namesFromData(globalSetMock.mock.calls[0]?.[0])).toEqual(["ping"]);
		expect(guildFetchMock).toHaveBeenCalledTimes(0);

		await handler.destroy();
	});

	test("guild sync calls the guild command manager without touching global", async () => {
		const { client, globalSetMock, guildFetchMock, guildSetCalls } = makeClient();
		const handler = createCommandHandler({ client, commands: [command("ping")], registration: { guilds: ["guild-1"] } });
		await handler.ready;

		await emitReady(client);

		expect(globalSetMock).toHaveBeenCalledTimes(0);
		expect(guildFetchMock).toHaveBeenCalledWith("guild-1");
		expect(guildSetCalls).toHaveLength(1);
		expect(namesFromData(guildSetCalls[0]?.data)).toEqual(["ping"]);

		await handler.destroy();
	});

	test("fs-loaded commands are included after boot", async () => {
		const dir = await mkdtemp(join(tmpdir(), "djs-commands-"));
		tempDirs.push(dir);
		await writeFile(join(dir, "fs-command.mjs"), 'export default { name: "from-fs", description: "fs command", run() {} };');
		const { client, globalSetMock } = makeClient();
		const handler = createCommandHandler({ client, commandDir: dir, dev: false });
		await handler.ready;

		await emitReady(client);

		expect(namesFromData(globalSetMock.mock.calls[0]?.[0])).toEqual(["from-fs"]);

		await handler.destroy();
	});

	test("plugin commands are included after boot", async () => {
		const { client, globalSetMock } = makeClient();
		const plugin: PluginManifest = { name: "demo", commands: [command("from-plugin")] };
		const handler = createCommandHandler({ client, commands: [command("base")], plugins: [plugin] });
		await handler.ready;

		await emitReady(client);

		expect(namesFromData(globalSetMock.mock.calls[0]?.[0])).toEqual(["base", "from-plugin"]);

		await handler.destroy();
	});
});
