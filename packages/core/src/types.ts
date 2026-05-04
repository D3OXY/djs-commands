import type { ChatInputCommandInteraction, Client } from "discord.js";
import type { CommandOptions, ResolveOptions } from "./options";

export interface CommandRunContext<S extends CommandOptions = Record<string, never>> {
	interaction: ChatInputCommandInteraction;
	options: ResolveOptions<S>;
}

export type CommandRun<S extends CommandOptions = Record<string, never>> = (ctx: CommandRunContext<S>) => void | Promise<void>;

export interface Command<S extends CommandOptions = Record<string, never>> {
	name: string;
	description: string;
	options?: S;
	run: CommandRun<S>;
}

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous command list erases the schema generic
export type AnyCommand = Command<any>;

export interface CommandHandlerOptions {
	client: Client;
	commands: AnyCommand[];
}

export interface CommandHandler {
	destroy: () => Promise<void>;
}
