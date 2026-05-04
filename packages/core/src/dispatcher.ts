import type { ChatInputCommandInteraction } from "discord.js";
import { extractOptions } from "./options";
import type { AnyCommand } from "./types";

export class Dispatcher {
	private readonly commands = new Map<string, AnyCommand>();

	register(command: AnyCommand): void {
		this.commands.set(command.name, command);
	}

	async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
		const command = this.commands.get(interaction.commandName);
		if (!command) return;
		const options = command.options ? extractOptions(interaction, command.options) : {};
		await command.run({ interaction, options });
	}
}
