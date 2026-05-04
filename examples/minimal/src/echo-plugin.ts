import { defineCommand, type PluginManifest } from "@djs-commands/core";

interface EchoPluginOptions {
	/** Optional prefix prepended to every echoed message. */
	prefix?: string;
}

/**
 * A tiny demo plugin that contributes a `/echo` command. Demonstrates the
 * plugin factory pattern: callers invoke `echoPlugin(opts)` and pass the
 * resulting manifest to `createCommandHandler`.
 */
export function echoPlugin(options: EchoPluginOptions = {}): PluginManifest {
	const prefix = options.prefix ?? "";

	const echo = defineCommand({
		name: "echo",
		description: "Echoes a message back",
		options: {
			message: { type: "string", description: "What to echo", required: true },
		},
		run: async ({ interaction, options: opts }) => {
			await interaction.reply(`${prefix}${opts.message}`);
		},
	});

	return {
		name: "echo-plugin",
		commands: [echo],
		setup: ({ client }) => {
			console.log(`[echo-plugin] ready (prefix=${JSON.stringify(prefix)}, user=${client.user?.tag ?? "<not logged in>"})`);
		},
		teardown: () => {
			console.log("[echo-plugin] shutting down");
		},
	};
}
