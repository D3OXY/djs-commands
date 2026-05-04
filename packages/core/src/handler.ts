import { type Client, Events, type Interaction } from "discord.js";
import { Dispatcher } from "./dispatcher";
import type { CommandHandler, CommandHandlerOptions } from "./types";

export function createCommandHandler(options: CommandHandlerOptions): CommandHandler {
	const dispatcher = new Dispatcher();
	for (const command of options.commands) {
		dispatcher.register(command);
	}

	const onInteraction = (interaction: Interaction) => {
		if (!interaction.isChatInputCommand()) return;
		dispatcher.dispatch(interaction).catch((err) => {
			console.error("[djs-commands] Unhandled command error:", err);
		});
	};

	const onReady = (client: Client<true>) => {
		if (!client.application) return;
		const data = options.commands.map((c) => ({ name: c.name, description: c.description }));
		client.application.commands.set(data).catch((err) => {
			console.error("[djs-commands] Failed to register application commands:", err);
		});
	};

	options.client.on(Events.InteractionCreate, onInteraction);
	options.client.once(Events.ClientReady, onReady);

	return {
		destroy: async () => {
			options.client.off(Events.InteractionCreate, onInteraction);
			options.client.off(Events.ClientReady, onReady);
		},
	};
}
