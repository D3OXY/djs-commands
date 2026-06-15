import type { CommandOptions } from "./options";
import type { Command } from "./types";

/**
 * Defines a command while preserving option inference for `ctx.options`.
 *
 * @example
 * ```ts
 * const ping = defineCommand({
 *   name: "ping",
 *   description: "Replies with pong",
 *   run: async ({ reply }) => reply("pong"),
 * });
 * ```
 */
export function defineCommand<S extends CommandOptions = Record<string, never>>(command: Command<S>): Command<S> {
	return command;
}
