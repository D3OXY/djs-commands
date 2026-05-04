import type { ChatInputCommandInteraction, Client } from "discord.js";

export interface CommandRunContext {
	interaction: ChatInputCommandInteraction;
}

export type CommandRun = (ctx: CommandRunContext) => void | Promise<void>;

export interface Command {
	name: string;
	description: string;
	run: CommandRun;
}

export interface CommandHandlerOptions {
	client: Client;
	commands: Command[];
}

export interface CommandHandler {
	destroy: () => Promise<void>;
}
