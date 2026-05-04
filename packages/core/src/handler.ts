import { Events, type Interaction } from "discord.js";
import { Dispatcher } from "./dispatcher";
import type { CommandHandler, CommandHandlerOptions } from "./types";

export function createCommandHandler(options: CommandHandlerOptions): CommandHandler {
	const dispatcher = new Dispatcher();
	for (const command of options.commands) {
		dispatcher.register(command);
	}

	const onInteraction = (interaction: Interaction) => {
		if (!interaction.isChatInputCommand()) return;
		void dispatcher.dispatch(interaction);
	};

	options.client.on(Events.InteractionCreate, onInteraction);

	options.client.once(Events.ClientReady, async (client) => {
		if (!client.application) return;
		const data = options.commands.map((c) => ({ name: c.name, description: c.description }));
		await client.application.commands.set(data);
	});

	return {
		destroy: async () => {
			options.client.off(Events.InteractionCreate, onInteraction);
		},
	};
}
