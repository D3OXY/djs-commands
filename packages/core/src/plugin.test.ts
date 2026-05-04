import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { EventEmitter } from "node:events";
import type { ChatInputCommandInteraction, Client } from "discord.js";
import { Events } from "discord.js";
import { createCommandHandler } from "./handler";
import type { PluginManifest } from "./plugin";
import type { AnyCommand } from "./types";

const fakeChatInteraction = (commandName: string, optionValues: Record<string, unknown> = {}) =>
	({
		isChatInputCommand: () => true,
		commandName,
		user: { id: "user-1" },
		guild: null,
		guildId: null,
		member: null,
		channel: null,
		channelId: "channel-1",
		client: {} as unknown,
		replied: false,
		deferred: false,
		reply: mock(async () => undefined),
		options: {
			getString: (name: string) => optionValues[name] ?? null,
			getInteger: (name: string) => optionValues[name] ?? null,
			getNumber: (name: string) => optionValues[name] ?? null,
			getBoolean: (name: string) => optionValues[name] ?? null,
			getUser: (name: string) => optionValues[name] ?? null,
			getChannel: (name: string) => optionValues[name] ?? null,
			getRole: (name: string) => optionValues[name] ?? null,
			getMentionable: (name: string) => optionValues[name] ?? null,
			getAttachment: (name: string) => optionValues[name] ?? null,
		},
	}) as unknown as ChatInputCommandInteraction;

// Minimal client stub: extends EventEmitter so on/once/off/emit work, plus a
// stubbed `application.commands.set` so the ClientReady handler can run.
const makeClient = () => {
	const emitter = new EventEmitter();
	const setMock = mock(async (_data: unknown) => {});
	const client = emitter as unknown as Client & { application: { commands: { set: typeof setMock } } };
	(client as unknown as { application: { commands: { set: typeof setMock } } }).application = {
		commands: { set: setMock },
	};
	return { client, setMock };
};

let consoleErrorSpy: ReturnType<typeof spyOn> | undefined;
beforeEach(() => {
	consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
	consoleErrorSpy?.mockRestore();
});

describe("plugin runtime", () => {
	test("setup hooks run in registration order", async () => {
		const { client } = makeClient();
		const order: string[] = [];

		const pluginA: PluginManifest = {
			name: "a",
			setup: async () => {
				order.push("a-start");
				await Promise.resolve();
				order.push("a-end");
			},
		};
		const pluginB: PluginManifest = {
			name: "b",
			setup: async () => {
				order.push("b-start");
				await Promise.resolve();
				order.push("b-end");
			},
		};

		const handler = createCommandHandler({ client, commands: [], plugins: [pluginA, pluginB] });
		await handler.ready;
		await handler.destroy();

		expect(order).toEqual(["a-start", "a-end", "b-start", "b-end"]);
	});

	test("setup hook receives a context with the client", async () => {
		const { client } = makeClient();
		const setup = mock(async (_ctx: { client: Client }) => {});
		const plugin: PluginManifest = { name: "ctx", setup };

		const handler = createCommandHandler({ client, commands: [], plugins: [plugin] });
		await handler.ready;
		await handler.destroy();

		expect(setup).toHaveBeenCalledTimes(1);
		expect(setup.mock.calls[0]?.[0]?.client).toBe(client);
	});

	test("setup failure aborts boot and re-throws with the plugin name", async () => {
		const { client } = makeClient();
		const failing: PluginManifest = {
			name: "broken",
			setup: () => {
				throw new Error("kaboom");
			},
		};
		const after = mock(async () => {});
		const afterPlugin: PluginManifest = { name: "after", setup: after };

		const handler = createCommandHandler({ client, commands: [], plugins: [failing, afterPlugin] });

		await expect(handler.ready).rejects.toThrow(/Plugin 'broken' setup failed: kaboom/);
		expect(after).toHaveBeenCalledTimes(0);

		await handler.destroy();
	});

	test("teardown errors are logged but do not block other teardowns", async () => {
		const { client } = makeClient();
		const teardownA = mock(async () => {});
		const teardownC = mock(async () => {});
		const plugins: PluginManifest[] = [
			{ name: "a", teardown: teardownA },
			{
				name: "b-fails",
				teardown: () => {
					throw new Error("boom");
				},
			},
			{ name: "c", teardown: teardownC },
		];

		const handler = createCommandHandler({ client, commands: [], plugins });
		await handler.ready;
		await handler.destroy();

		expect(teardownA).toHaveBeenCalledTimes(1);
		expect(teardownC).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledWith("[djs-commands] Plugin 'b-fails' teardown failed:", expect.any(Error));
	});

	test("teardown runs in registration order", async () => {
		const { client } = makeClient();
		const order: string[] = [];
		const plugins: PluginManifest[] = [
			{
				name: "a",
				teardown: async () => {
					order.push("a");
				},
			},
			{
				name: "b",
				teardown: async () => {
					order.push("b");
				},
			},
		];

		const handler = createCommandHandler({ client, commands: [], plugins });
		await handler.ready;
		await handler.destroy();

		expect(order).toEqual(["a", "b"]);
	});

	test("plugin commands dispatch correctly", async () => {
		const { client } = makeClient();
		const run = mock(async (_ctx: unknown) => {});
		const pluginCommand: AnyCommand = {
			name: "from-plugin",
			description: "test",
			run,
		};
		const plugin: PluginManifest = { name: "demo", commands: [pluginCommand] };

		const handler = createCommandHandler({ client, commands: [], plugins: [plugin] });
		await handler.ready;

		client.emit(Events.InteractionCreate, fakeChatInteraction("from-plugin"));
		await new Promise((resolve) => setImmediate(resolve));

		expect(run).toHaveBeenCalledTimes(1);

		await handler.destroy();
	});

	test("plugin commands are included in slash command registration on ClientReady", async () => {
		const { client, setMock } = makeClient();
		const pluginCommand: AnyCommand = {
			name: "from-plugin",
			description: "registered",
			run: () => {},
		};
		const baseCommand: AnyCommand = {
			name: "from-base",
			description: "base",
			run: () => {},
		};

		const handler = createCommandHandler({
			client,
			commands: [baseCommand],
			plugins: [{ name: "demo", commands: [pluginCommand] }],
		});
		await handler.ready;

		client.emit(Events.ClientReady, client as unknown as Client<true>);
		await new Promise((resolve) => setImmediate(resolve));

		expect(setMock).toHaveBeenCalledTimes(1);
		const data = setMock.mock.calls[0]?.[0] as { name: string }[];
		expect(data.map((c) => c.name)).toEqual(["from-base", "from-plugin"]);

		await handler.destroy();
	});

	test("handler with no plugins still works", async () => {
		const { client } = makeClient();
		const handler = createCommandHandler({ client, commands: [] });
		await handler.ready;
		await handler.destroy();
	});
});
