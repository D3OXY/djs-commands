import type { ChatInputCommandInteraction, Client, PermissionsString } from "discord.js";
import type { CommandOptions, ResolveOptions } from "./options";
import type { PluginManifest } from "./plugin";
import type { CanRunCommand, Validator } from "./validators";

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
	ownerOnly?: boolean;
	guildOnly?: boolean;
	channels?: readonly string[];
	permissions?: readonly PermissionsString[];
	roles?: readonly string[];
	validators?: readonly Validator[];
}

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous command list erases the schema generic
export type AnyCommand = Command<any>;

export interface CommandHandlerOptions {
	client: Client;
	commands: AnyCommand[];
	botOwners?: readonly string[];
	validators?: readonly Validator[];
	canRunCommand?: CanRunCommand;
	plugins?: PluginManifest[];
}

export interface CommandHandler {
	/** Resolves once all plugin `setup` hooks have completed; rejects if any plugin's setup throws. */
	ready: Promise<void>;
	destroy: () => Promise<void>;
}
