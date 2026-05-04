import { expect, mock, test } from "bun:test";
import type { ChatInputCommandInteraction } from "discord.js";
import { Dispatcher } from "./dispatcher";

const fakeInteraction = (commandName: string) => ({ commandName }) as unknown as ChatInputCommandInteraction;

test("dispatch invokes the registered command's run handler", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async () => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(fakeInteraction("ping"));

	expect(run).toHaveBeenCalledTimes(1);
});

test("dispatch is a no-op when no command matches the interaction's commandName", async () => {
	const dispatcher = new Dispatcher();
	const run = mock(async () => {});
	dispatcher.register({ name: "ping", description: "ping", run });

	await dispatcher.dispatch(fakeInteraction("nonexistent"));

	expect(run).toHaveBeenCalledTimes(0);
});

test("registering a command with the same name overwrites the previous one", async () => {
	const dispatcher = new Dispatcher();
	const first = mock(async () => {});
	const second = mock(async () => {});
	dispatcher.register({ name: "ping", description: "ping", run: first });
	dispatcher.register({ name: "ping", description: "ping", run: second });

	await dispatcher.dispatch(fakeInteraction("ping"));

	expect(first).toHaveBeenCalledTimes(0);
	expect(second).toHaveBeenCalledTimes(1);
});
