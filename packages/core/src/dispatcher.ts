import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { type CacheAdapter, CooldownEngine } from "./cooldowns";
import { extractOptions } from "./options";
import type { AnyCommand } from "./types";
import { type CanRunCommand, runValidatorChain, type Validator } from "./validators";

interface DispatcherConfig {
	botOwners: readonly string[];
	globalValidators: readonly Validator[];
	canRunCommand?: CanRunCommand;
	cacheAdapter?: CacheAdapter;
}

export class Dispatcher {
	private readonly commands = new Map<string, AnyCommand>();
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
	}

	async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
		const command = this.commands.get(interaction.commandName);
		if (!command) return;

		const validation = await runValidatorChain(
			{ interaction, command, botOwners: this.config.botOwners },
			{ globalValidators: this.config.globalValidators, canRunCommand: this.config.canRunCommand }
		);

		if (!validation.ok) {
			if (interaction.replied || interaction.deferred) return;
			await interaction.reply({ content: validation.reason, flags: MessageFlags.Ephemeral });
			return;
		}

		const remaining = await this.cooldowns.check(command, interaction);
		if (remaining !== null) {
			if (interaction.replied || interaction.deferred) return;
			await interaction.reply({
				content: `On cooldown — try again in ${(remaining / 1000).toFixed(1)}s.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await this.cooldowns.start(command, interaction);

		const options = command.options ? extractOptions(interaction, command.options) : {};
		await command.run({ interaction, options });
	}
}
