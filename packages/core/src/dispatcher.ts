import { type ChatInputCommandInteraction, type GuildMember, type Message, MessageFlags } from "discord.js";
import { normalizeLegacyContext, normalizeSlashContext } from "./context";
import { type CacheAdapter, CooldownEngine } from "./cooldowns";
import { parseLegacyArgs } from "./legacy-parser";
import { extractOptions } from "./options";
import { getChannelLocks, isCommandDisabled, type Storage } from "./storage";
import type { AnyCommand } from "./types";
import { type CanRunCommand, runValidatorChain, type Validator, type ValidatorContext, type ValidatorSource } from "./validators";

interface DispatcherConfig {
	botOwners: readonly string[];
	globalValidators: readonly Validator[];
	canRunCommand?: CanRunCommand;
	cacheAdapter?: CacheAdapter;
	storage?: Storage;
	storageFeatures: {
		disabledCommands: boolean;
		channelLocks: boolean;
	};
}

export class Dispatcher {
	private readonly commands = new Map<string, AnyCommand>();
	private readonly aliases = new Map<string, AnyCommand>();
	private readonly config: DispatcherConfig;
	private readonly cooldowns: CooldownEngine;

	constructor(config: Partial<DispatcherConfig> = {}) {
		this.config = {
			botOwners: config.botOwners ?? [],
			globalValidators: config.globalValidators ?? [],
			canRunCommand: config.canRunCommand,
			cacheAdapter: config.cacheAdapter,
			storage: config.storage,
			storageFeatures: config.storageFeatures ?? { disabledCommands: false, channelLocks: false },
		};
		this.cooldowns = new CooldownEngine(this.config.cacheAdapter);
	}

	register(command: AnyCommand): void {
		this.commands.set(command.name, command);
		for (const alias of command.legacy?.aliases ?? []) {
			this.aliases.set(alias, command);
		}
	}

	async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
		const command = this.commands.get(interaction.commandName);
		if (!command) return;

		const validatorCtx: ValidatorContext = {
			command,
			botOwners: this.config.botOwners,
			user: interaction.user,
			guild: interaction.guild,
			member: interaction.member as GuildMember | null,
			channelId: interaction.channelId,
			source: { type: "slash", interaction },
		};

		const validation = await runValidatorChain(validatorCtx, {
			globalValidators: this.config.globalValidators,
			canRunCommand: this.config.canRunCommand,
		});

		if (!validation.ok) {
			await replyFailure(validatorCtx.source, validation.reason);
			return;
		}

		const storageGate = await this.runStorageGates(command, interaction.guildId, interaction.channelId);
		if (storageGate) {
			await replyFailure(validatorCtx.source, storageGate);
			return;
		}

		const actor = { userId: interaction.user.id, guildId: interaction.guildId };
		const remaining = await this.cooldowns.check(command, actor);
		if (remaining !== null) {
			await replyFailure(validatorCtx.source, formatCooldown(remaining));
			return;
		}
		await this.cooldowns.start(command, actor);

		const options = command.options ? extractOptions(interaction, command.options) : {};
		await command.run(normalizeSlashContext(interaction, options));
	}

	async dispatchMessage(message: Message, prefix: string, legacyDefaultEnabled: boolean): Promise<void> {
		if (message.author.bot) return;
		if (!message.content.startsWith(prefix)) return;
		const stripped = message.content.slice(prefix.length).trim();
		if (!stripped) return;
		const tokens = stripped.split(/\s+/);
		const name = tokens.shift();
		if (!name) return;

		const command = this.commands.get(name) ?? this.aliases.get(name);
		if (!command) return;
		const enabled = command.legacy?.enabled ?? legacyDefaultEnabled;
		if (!enabled) return;

		const validatorCtx: ValidatorContext = {
			command,
			botOwners: this.config.botOwners,
			user: message.author,
			guild: message.guild,
			member: message.member,
			channelId: message.channelId,
			source: { type: "legacy", message },
		};

		const validation = await runValidatorChain(validatorCtx, {
			globalValidators: this.config.globalValidators,
			canRunCommand: this.config.canRunCommand,
		});

		if (!validation.ok) {
			await replyFailure(validatorCtx.source, validation.reason);
			return;
		}

		const storageGate = await this.runStorageGates(command, message.guildId, message.channelId);
		if (storageGate) {
			await replyFailure(validatorCtx.source, storageGate);
			return;
		}

		const actor = { userId: message.author.id, guildId: message.guildId };
		const remaining = await this.cooldowns.check(command, actor);
		if (remaining !== null) {
			await replyFailure(validatorCtx.source, formatCooldown(remaining));
			return;
		}

		const parsed = parseLegacyArgs(tokens, command.options, message);
		if (!parsed.ok) {
			await message.reply(parsed.error);
			return;
		}

		await this.cooldowns.start(command, actor);
		await command.run(normalizeLegacyContext(message, parsed.options));
	}

	/**
	 * Storage-backed runtime gates: per-guild kill switch (DisabledCommands) and
	 * per-guild channel allow-list (ChannelLocks). Returns a failure reason if
	 * the command should be blocked, or null if it can proceed. No-op when no
	 * storage is configured or the invocation is outside a guild.
	 */
	private async runStorageGates(command: AnyCommand, guildId: string | null, channelId: string): Promise<string | null> {
		const storage = this.config.storage;
		if (!storage || !guildId) return null;

		try {
			if (this.config.storageFeatures.disabledCommands && (await isCommandDisabled(storage, guildId, command.name))) {
				return "This command is currently disabled in this server.";
			}
			if (this.config.storageFeatures.channelLocks) {
				const locks = await getChannelLocks(storage, guildId, command.name);
				if (locks.length > 0 && !locks.includes(channelId)) {
					return "This command is locked to a different channel.";
				}
			}
		} catch (err) {
			console.error("[djs-commands] Storage gate check failed:", err);
		}
		return null;
	}
}

function formatCooldown(remainingMs: number): string {
	return `On cooldown — try again in ${(remainingMs / 1000).toFixed(1)}s.`;
}

async function replyFailure(source: ValidatorSource, reason: string): Promise<void> {
	if (source.type === "slash") {
		if (source.interaction.replied || source.interaction.deferred) return;
		await source.interaction.reply({ content: reason, flags: MessageFlags.Ephemeral });
		return;
	}
	await source.message.reply(reason);
}
