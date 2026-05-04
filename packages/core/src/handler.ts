import { type ApplicationCommandDataResolvable, type Client, Events, type Interaction } from "discord.js";
import { Dispatcher } from "./dispatcher";
import { buildOptionsData } from "./options";
import type { AnyCommand, CommandHandler, CommandHandlerOptions } from "./types";

export function createCommandHandler(options: CommandHandlerOptions): CommandHandler {
	const plugins = options.plugins ?? [];
	const allCommands: AnyCommand[] = [...options.commands];
	for (const plugin of plugins) {
		if (plugin.commands) allCommands.push(...plugin.commands);
	}

	const dispatcher = new Dispatcher({
		botOwners: options.botOwners ?? [],
		globalValidators: options.validators ?? [],
		canRunCommand: options.canRunCommand,
	});
	for (const command of allCommands) {
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
		const data = allCommands.map((c) => ({
			name: c.name,
			description: c.description,
			options: buildOptionsData(c.options),
		})) as unknown as ApplicationCommandDataResolvable[];
		client.application.commands.set(data).catch((err) => {
			console.error("[djs-commands] Failed to register application commands:", err);
		});
	};

	options.client.on(Events.InteractionCreate, onInteraction);
	options.client.once(Events.ClientReady, onReady);

	const bootPromise = (async () => {
		for (const plugin of plugins) {
			if (!plugin.setup) continue;
			try {
				await plugin.setup({ client: options.client });
			} catch (err) {
				throw new Error(`[djs-commands] Plugin '${plugin.name}' setup failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
			}
		}
	})();

	return {
		destroy: async () => {
			options.client.off(Events.InteractionCreate, onInteraction);
			options.client.off(Events.ClientReady, onReady);
			// Wait for boot to settle so we don't tear down mid-setup. Boot errors
			// are surfaced via `ready`; destroy still tears plugins down.
			await bootPromise.catch(() => {});
			for (const plugin of plugins) {
				if (!plugin.teardown) continue;
				try {
					await plugin.teardown();
				} catch (err) {
					console.error(`[djs-commands] Plugin '${plugin.name}' teardown failed:`, err);
				}
			}
		},
		ready: bootPromise,
	};
}
