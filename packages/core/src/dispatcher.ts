import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { extractOptions } from "./options";
import type { AnyCommand } from "./types";
import { type CanRunCommand, runValidatorChain, type Validator } from "./validators";

interface DispatcherConfig {
	botOwners: readonly string[];
	globalValidators: readonly Validator[];
	canRunCommand?: CanRunCommand;
}

export class Dispatcher {
	private readonly commands = new Map<string, AnyCommand>();
	private readonly config: DispatcherConfig;

	constructor(config: Partial<DispatcherConfig> = {}) {
		this.config = {
			botOwners: config.botOwners ?? [],
			globalValidators: config.globalValidators ?? [],
			canRunCommand: config.canRunCommand,
		};
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

		const options = command.options ? extractOptions(interaction, command.options) : {};
		await command.run({ interaction, options });
	}
}
