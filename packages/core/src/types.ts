import type {
	ChatInputCommandInteraction,
	Client,
	Guild,
	GuildMember,
	InteractionReplyOptions,
	Message,
	MessageReplyOptions,
	PermissionsString,
	TextBasedChannel,
	User,
} from "discord.js";
import type { CacheAdapter, CooldownConfig } from "./cooldowns";
import type { CommandOptions, ResolveOptions } from "./options";
import type { PluginManifest } from "./plugin";
import type { CommandRegistrationConfig, HandlerRegistrationConfig } from "./registration";
import type { Storage } from "./storage";
import type { CanRunCommand, Validator } from "./validators";

/** Shared fields available to both slash and legacy command runs. */
export type CommandReplyInput = string | Omit<InteractionReplyOptions, "ephemeral"> | MessageReplyOptions;

interface BaseRunContext<S extends CommandOptions = Record<string, never>> {
	/** Discord.js client that received the command. */
	client: Client;
	/** User who invoked the command. */
	author: User;
	/** Guild where the command ran, or null in DMs. */
	guild: Guild | null;
	/** Guild member for the author when available. */
	member: GuildMember | null;
	/** Text-capable channel where the command ran, when discord.js exposes it. */
	channel: TextBasedChannel | null;
	/** Channel ID for validator and storage lookups. */
	channelId: string | null;
	/** Typed option values resolved from slash options or legacy positional args. */
	options: ResolveOptions<S>;
	/** Convenience reply helper for slash interactions and legacy messages. Use `flags: MessageFlags.Ephemeral` for ephemeral slash replies. */
	reply: (content: CommandReplyInput) => Promise<unknown>;
}

/** Command context for slash-command invocations. Narrow with `ctx.type === "slash"`. */
export type SlashRunContext<S extends CommandOptions = Record<string, never>> = BaseRunContext<S> & {
	/** Discriminator for slash invocations. */
	type: "slash";
	/** Raw discord.js chat-input interaction for advanced replies/defer flows. */
	interaction: ChatInputCommandInteraction;
};

/** Command context for legacy prefix invocations. Narrow with `ctx.type === "legacy"`. */
export type LegacyRunContext<S extends CommandOptions = Record<string, never>> = BaseRunContext<S> & {
	/** Discriminator for legacy prefix invocations. */
	type: "legacy";
	/** Raw discord.js message that invoked the command. */
	message: Message;
};

/** Discriminated union passed to every command `run` callback. */
export type CommandRunContext<S extends CommandOptions = Record<string, never>> = SlashRunContext<S> | LegacyRunContext<S>;

/** Function signature for command execution. */
export type CommandRun<S extends CommandOptions = Record<string, never>> = (ctx: CommandRunContext<S>) => void | Promise<void>;

/** Per-command legacy prefix settings. Handler-level `legacy.enabled` must also be true. */
export interface CommandLegacyConfig {
	/** Opt this command into legacy prefix invocation. Defaults to true when `legacy.enabled` on the handler is true. */
	enabled?: boolean;
	/** Alternative names that resolve to this command in legacy mode. */
	aliases?: readonly string[];
}

/** Complete command definition accepted by `defineCommand` and the dispatcher. */
export interface Command<S extends CommandOptions = Record<string, never>> {
	/** Discord command name and legacy command name. Use Discord's lowercase slash-command naming rules. */
	name: string;
	/** Discord slash-command description. */
	description: string;
	/** Option schema used for Discord registration and typed `ctx.options`. */
	options?: S;
	/** Command implementation called after built-in, global, and command validators pass. */
	run: CommandRun<S>;
	/** Restrict to IDs listed in handler `botOwners`. */
	ownerOnly?: boolean;
	/** Reject DM usage; command only runs in guilds. */
	guildOnly?: boolean;
	/** Allow-list of channel IDs where the command can run. */
	channels?: readonly string[];
	/** Discord permissions required from the invoking guild member. */
	permissions?: readonly PermissionsString[];
	/** Role IDs required from the invoking guild member. */
	roles?: readonly string[];
	/** Command-specific validators appended after built-ins and global validators. */
	validators?: readonly Validator[];
	/** Cooldown scope and duration. Uses in-memory storage unless the handler has a `cacheAdapter`. */
	cooldown?: CooldownConfig;
	/** Per-command legacy prefix behavior and aliases. */
	legacy?: CommandLegacyConfig;
	/** Controls whether this command is included in handler-managed Discord registration scopes. */
	registration?: CommandRegistrationConfig;
}

/** Heterogeneous command alias for registries where every command may have different options. */
// biome-ignore lint/suspicious/noExplicitAny: heterogeneous command list erases the schema generic
export type AnyCommand = Command<any>;

/** Handler-wide legacy prefix settings. */
export interface HandlerLegacyConfig {
	/** Master switch — when false, the messageCreate listener is not attached. */
	enabled: boolean;
	/** Prefix used when no per-guild override exists. */
	defaultPrefix: string;
}

/** Storage-backed feature switches. Only enabled features query `storage`. */
export interface StorageFeaturesConfig {
	/** Per-guild legacy prefix overrides. Defaults to `legacy.enabled` when storage is configured. */
	guildPrefixes?: boolean;
	/** Per-guild command kill switch. Defaults to false. */
	disabledCommands?: boolean;
	/** Per-guild command channel allow-list. Defaults to false. */
	channelLocks?: boolean;
}

/** Options passed to `createCommandHandler` to wire a discord.js client. */
export interface CommandHandlerOptions {
	/** Discord.js client instance. */
	client: Client;
	/** Inline command definitions to register immediately. */
	commands?: AnyCommand[];
	/** Directory to recursively load command files from. Each file's default export is registered if it looks like a Command. */
	commandDir?: string;
	/** Directory to recursively load event files from. Each file's default export is registered if it looks like an EventDefinition (see defineEvent). */
	eventDir?: string;
	/** Enable hot-reload of command files while the process runs. Defaults to true when NODE_ENV !== "production". */
	dev?: boolean;
	/** Discord user IDs allowed to run `ownerOnly` commands. */
	botOwners?: readonly string[];
	/** Global validators run for every command after built-in validators. */
	validators?: readonly Validator[];
	/** Single lightweight gate called after validators; return `false` or a reason string to reject. */
	canRunCommand?: CanRunCommand;
	/** Plugin manifests whose commands and lifecycle hooks are merged into the handler. */
	plugins?: PluginManifest[];
	/** Discord application command registration plan. Defaults to syncing global commands. Pass false to disable. */
	registration?: HandlerRegistrationConfig;
	/** Shared TTL cache for cooldowns. Without one, cooldowns are process-local memory only. */
	cacheAdapter?: CacheAdapter;
	/** Enables legacy prefix commands and sets the fallback prefix. */
	legacy?: HandlerLegacyConfig;
	/** Persistent storage adapter for enabled framework features. */
	storage?: Storage;
	/** Opt into storage-backed framework features. */
	storageFeatures?: StorageFeaturesConfig;
}

/** Handle returned by `createCommandHandler`. */
export interface CommandHandler {
	/** Resolves once all plugin `setup` hooks have completed; rejects if any plugin's setup throws. */
	ready: Promise<void>;
	/** Detaches listeners, stops file watching, and runs plugin teardowns. Does not delete Discord commands. */
	destroy: () => Promise<void>;
}
