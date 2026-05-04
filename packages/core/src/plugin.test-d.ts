import type { Client } from "discord.js";
import { expectTypeOf } from "expect-type";
import { defineCommand } from "./define-command";
import type { PluginManifest, PluginSetupContext } from "./plugin";
import type { AnyCommand, CommandHandlerOptions } from "./types";

// Plugin manifest only requires `name`; everything else is optional.
const minimal: PluginManifest = { name: "minimal" };
expectTypeOf(minimal.name).toEqualTypeOf<string>();
expectTypeOf(minimal.commands).toEqualTypeOf<AnyCommand[] | undefined>();
expectTypeOf(minimal.setup).toEqualTypeOf<((ctx: PluginSetupContext) => void | Promise<void>) | undefined>();
expectTypeOf(minimal.teardown).toEqualTypeOf<(() => void | Promise<void>) | undefined>();

// Setup context exposes `client` and nothing else mandatory.
const setupCtx: PluginSetupContext = { client: {} as Client };
expectTypeOf(setupCtx.client).toEqualTypeOf<Client>();

// Async setup/teardown shapes are accepted.
const asyncPlugin: PluginManifest = {
	name: "async",
	setup: async ({ client }) => {
		expectTypeOf(client).toEqualTypeOf<Client>();
	},
	teardown: async () => {},
};
expectTypeOf(asyncPlugin.setup).toEqualTypeOf<((ctx: PluginSetupContext) => void | Promise<void>) | undefined>();

// Sync setup/teardown shapes are also accepted.
const syncPlugin: PluginManifest = {
	name: "sync",
	setup: () => {},
	teardown: () => {},
};
expectTypeOf(syncPlugin).toEqualTypeOf<PluginManifest>();

// Plugin commands accept commands defined via `defineCommand`.
const ping = defineCommand({
	name: "ping",
	description: "ping",
	run: () => {},
});
const pluginWithCommands: PluginManifest = {
	name: "with-commands",
	commands: [ping],
};
expectTypeOf(pluginWithCommands.commands).toEqualTypeOf<AnyCommand[] | undefined>();

// `plugins` is an optional array on CommandHandlerOptions.
expectTypeOf<CommandHandlerOptions["plugins"]>().toEqualTypeOf<PluginManifest[] | undefined>();

// Factory pattern: a function returning a manifest is the recommended shape.
type PluginFactory<O = void> = (options?: O) => PluginManifest;
const factory: PluginFactory<{ greeting: string }> = (opts) => ({
	name: "greeter",
	setup: ({ client }) => {
		void client;
		void opts;
	},
});
expectTypeOf(factory({ greeting: "hi" })).toEqualTypeOf<PluginManifest>();
