import { expect, mock, test } from "bun:test";
import type { ChatInputCommandInteraction } from "discord.js";
import { Dispatcher } from "./dispatcher";

const fakeInteraction = (commandName: string, optionValues: Record<string, unknown> = {}) =>
	({
		commandName,
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

test("dispatch extracts options from the interaction and passes them to run", async () => {
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
	expect(run.mock.calls[0]?.[0]).toMatchObject({ options: { message: "hello" } });
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
