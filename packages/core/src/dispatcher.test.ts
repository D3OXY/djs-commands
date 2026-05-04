import { expect, mock, test } from "bun:test";
import type { ChatInputCommandInteraction } from "discord.js";
import { Dispatcher } from "./dispatcher";
import type { Storage, StorageFindOpts, StorageWhere } from "./storage";

const fakeInteraction = (commandName: string, optionValues: Record<string, unknown> = {}) =>
	({
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

test("dispatch invokes the registered command's run handler", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(fakeInteraction("ping"));

	expect(run).toHaveBeenCalledTimes(1);
});

test("dispatch is a no-op when no command matches the interaction's commandName", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(fakeInteraction("nonexistent"));

	expect(run).toHaveBeenCalledTimes(0);
});

test("registering a command with the same name overwrites the previous one", async () => {
	const dispatcher = new Dispatcher();
	const first = mock(async (_ctx: unknown) => {});
	const second = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run: first });
	dispatcher.register({ name: "ping", description: "ping", run: second });

	await dispatcher.dispatch(fakeInteraction("ping"));

	expect(first).toHaveBeenCalledTimes(0);
	expect(second).toHaveBeenCalledTimes(1);
});

test("dispatch extracts options from the interaction and passes them via ctx.options", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({
		name: "echo",
		description: "echo",
		options: {
			message: { type: "string", description: "msg", required: true },
		},
		run,
	});

	await dispatcher.dispatch(fakeInteraction("echo", { message: "hello" }));

	expect(run).toHaveBeenCalledTimes(1);
	expect(run.mock.calls[0]?.[0]).toMatchObject({ options: { message: "hello" }, type: "slash" });
});

test("dispatch passes undefined for missing optional options", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({
		name: "echo",
		description: "echo",
		options: {
			message: { type: "string", description: "msg" },
		},
		run,
	});

	await dispatcher.dispatch(fakeInteraction("echo"));

	expect(run).toHaveBeenCalledTimes(1);
	expect(run.mock.calls[0]?.[0]).toMatchObject({ options: { message: undefined } });
});

test("dispatch passes empty options object when the command declares no schema", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(fakeInteraction("ping"));

	expect(run).toHaveBeenCalledTimes(1);
	expect(run.mock.calls[0]?.[0]).toMatchObject({ options: {} });
});

test("dispatch passes a unified ctx with reply/author/guild/channelId", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(fakeInteraction("ping"));

	const ctx = run.mock.calls[0]?.[0] as { type: string; channelId: string; reply: unknown };
	expect(ctx?.type).toBe("slash");
	expect(ctx?.channelId).toBe("channel-1");
	expect(typeof ctx?.reply).toBe("function");
});

// ─── storage-backed runtime gates ─────────────────────────────────────────

type FakeRow = Record<string, unknown>;

const matches = (row: FakeRow, where: StorageWhere): boolean => {
	for (const [k, v] of Object.entries(where)) {
		if (row[k] !== v) return false;
	}
	return true;
};

const fakeStorage = (initial: Record<string, FakeRow[]> = {}): Storage => {
	const tables = new Map<string, FakeRow[]>(Object.entries(initial));
	const getTable = (model: string) => {
		if (!tables.has(model)) tables.set(model, []);
		const t = tables.get(model);
		if (!t) throw new Error("unreachable");
		return t;
	};
	return {
		async create(model, data) {
			getTable(model).push({ ...data });
			return data;
		},
		async findOne(model, where) {
			const row = getTable(model).find((r) => matches(r, where));
			return (row ?? null) as never;
		},
		async findMany(model, opts: StorageFindOpts = {}) {
			const where = opts.where;
			let rows = getTable(model);
			if (where) rows = rows.filter((r) => matches(r, where));
			return [...rows] as never;
		},
		async update(model, where, data) {
			const row = getTable(model).find((r) => matches(r, where));
			if (!row) throw new Error("no match");
			Object.assign(row, data);
			return row as never;
		},
		async delete(model, where) {
			const t = getTable(model);
			for (let i = t.length - 1; i >= 0; i--) {
				const row = t[i];
				if (row && matches(row, where)) t.splice(i, 1);
			}
		},
		async count(model, where) {
			const t = getTable(model);
			return where ? t.filter((r) => matches(r, where)).length : t.length;
		},
	};
};

const guildInteraction = (commandName: string, channelId = "channel-1", guildId = "guild-1") =>
	({
		commandName,
		user: { id: "user-1" },
		guild: { id: guildId },
		guildId,
		member: null,
		channel: null,
		channelId,
		client: {} as unknown,
		replied: false,
		deferred: false,
		reply: mock(async () => undefined),
		options: {
			getString: () => null,
			getInteger: () => null,
			getNumber: () => null,
			getBoolean: () => null,
			getUser: () => null,
			getChannel: () => null,
			getRole: () => null,
			getMentionable: () => null,
			getAttachment: () => null,
		},
	}) as unknown as ChatInputCommandInteraction;

test("storage gate: blocks when DisabledCommands has a row for this guild+command", async () => {
	const storage = fakeStorage({
		disabled_commands: [{ guild_id: "guild-1", command_name: "ping" }],
	});
	const dispatcher = new Dispatcher({ storage });
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(guildInteraction("ping"));

	expect(run).toHaveBeenCalledTimes(0);
});

test("storage gate: lets command through when not disabled", async () => {
	const storage = fakeStorage();
	const dispatcher = new Dispatcher({ storage });
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(guildInteraction("ping"));

	expect(run).toHaveBeenCalledTimes(1);
});

test("storage gate: blocks when channel locks exist and current channel is not allowed", async () => {
	const storage = fakeStorage({
		channel_locks: [{ guild_id: "guild-1", command_name: "ping", channel_id: "allowed-channel" }],
	});
	const dispatcher = new Dispatcher({ storage });
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(guildInteraction("ping", "blocked-channel"));

	expect(run).toHaveBeenCalledTimes(0);
});

test("storage gate: allows when current channel is in the lock list", async () => {
	const storage = fakeStorage({
		channel_locks: [{ guild_id: "guild-1", command_name: "ping", channel_id: "allowed-channel" }],
	});
	const dispatcher = new Dispatcher({ storage });
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(guildInteraction("ping", "allowed-channel"));

	expect(run).toHaveBeenCalledTimes(1);
});

test("storage gate: no-op when invocation isn't in a guild (DMs)", async () => {
	const storage = fakeStorage({
		disabled_commands: [{ guild_id: "guild-1", command_name: "ping" }],
	});
	const dispatcher = new Dispatcher({ storage });
	const run = mock(async (_ctx: unknown) => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	// guildId: null → DM context, gates skip and command runs
	await dispatcher.dispatch(fakeInteraction("ping"));

	expect(run).toHaveBeenCalledTimes(1);
});
