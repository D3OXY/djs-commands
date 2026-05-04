import type { ChatInputCommandInteraction } from "discord.js";
import type { Command } from "./types";

export class Dispatcher {
	private readonly commands = new Map<string, Command>();

	register(command: Command): void {
		this.commands.set(command.name, command);
	}

	async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
		const command = this.commands.get(interaction.commandName);
		if (!command) return;
		await command.run({ interaction });
	}
}
