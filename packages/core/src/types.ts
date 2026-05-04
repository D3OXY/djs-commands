import type { ChatInputCommandInteraction, Client, Guild, GuildMember, Message, PermissionsString, TextBasedChannel, User } from "discord.js";
import type { CacheAdapter, CooldownConfig } from "./cooldowns";
import type { CommandOptions, ResolveOptions } from "./options";
import type { PluginManifest } from "./plugin";
import type { CanRunCommand, Validator } from "./validators";

interface BaseRunContext<S extends CommandOptions = Record<string, never>> {
	client: Client;
	author: User;
	guild: Guild | null;
	member: GuildMember | null;
	channel: TextBasedChannel | null;
	channelId: string | null;
	options: ResolveOptions<S>;
	reply: (content: string | { content?: string; ephemeral?: boolean; [key: string]: unknown }) => Promise<unknown>;
}

export type SlashRunContext<S extends CommandOptions = Record<string, never>> = BaseRunContext<S> & {
	type: "slash";
	interaction: ChatInputCommandInteraction;
};

export type LegacyRunContext<S extends CommandOptions = Record<string, never>> = BaseRunContext<S> & {
	type: "legacy";
	message: Message;
};

export type CommandRunContext<S extends CommandOptions = Record<string, never>> = SlashRunContext<S> | LegacyRunContext<S>;

export type CommandRun<S extends CommandOptions = Record<string, never>> = (ctx: CommandRunContext<S>) => void | Promise<void>;

export interface CommandLegacyConfig {
	/** Opt this command into legacy prefix invocation. Defaults to true when `legacy.enabled` on the handler is true. */
	enabled?: boolean;
	/** Alternative names that resolve to this command in legacy mode. */
	aliases?: readonly string[];
}

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
	cooldown?: CooldownConfig;
	legacy?: CommandLegacyConfig;
}

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous command list erases the schema generic
export type AnyCommand = Command<any>;

export interface HandlerLegacyConfig {
	/** Master switch — when false, the messageCreate listener is not attached. */
	enabled: boolean;
	/** Prefix used when no per-guild override exists. Storage-backed override lands in slice #59. */
	defaultPrefix: string;
}

export interface CommandHandlerOptions {
	client: Client;
	commands: AnyCommand[];
	botOwners?: readonly string[];
	validators?: readonly Validator[];
	canRunCommand?: CanRunCommand;
	plugins?: PluginManifest[];
	cacheAdapter?: CacheAdapter;
	legacy?: HandlerLegacyConfig;
}

export interface CommandHandler {
	/** Resolves once all plugin `setup` hooks have completed; rejects if any plugin's setup throws. */
	ready: Promise<void>;
	destroy: () => Promise<void>;
}
