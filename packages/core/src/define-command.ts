import type { CommandOptions } from "./options";
import type { Command } from "./types";

export function defineCommand<S extends CommandOptions = Record<string, never>>(command: Command<S>): Command<S> {
	return command;
}
