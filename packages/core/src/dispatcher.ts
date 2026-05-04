import { type ChatInputCommandInteraction, type GuildMember, type Message, MessageFlags } from "discord.js";
import { normalizeLegacyContext, normalizeSlashContext } from "./context";
import { type CacheAdapter, CooldownEngine } from "./cooldowns";
import { parseLegacyArgs } from "./legacy-parser";
import { extractOptions } from "./options";
import type { AnyCommand } from "./types";
import { type CanRunCommand, runValidatorChain, type Validator, type ValidatorContext, type ValidatorSource } from "./validators";

interface DispatcherConfig {
	botOwners: readonly string[];
	globalValidators: readonly Validator[];
	canRunCommand?: CanRunCommand;
	cacheAdapter?: CacheAdapter;
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
