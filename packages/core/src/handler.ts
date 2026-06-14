import { type ApplicationCommandDataResolvable, type Client, Events, type Interaction, type Message } from "discord.js";
import type { EventDefinition } from "./define-event";
import { Dispatcher } from "./dispatcher";
import { loadCommandsFromDir, loadEventsFromDir, type WatchHandle, watchCommandsDir } from "./fs-loader";
import { buildOptionsData } from "./options";
import { ChannelLocksModel, DisabledCommandsModel, type FrameworkStorageModel, GuildPrefixModel, getGuildPrefix } from "./storage";
import type { AnyCommand, CommandHandler, CommandHandlerOptions, StorageFeaturesConfig } from "./types";

export function createCommandHandler(options: CommandHandlerOptions): CommandHandler {
	const plugins = options.plugins ?? [];
	const dev = options.dev ?? process.env.NODE_ENV !== "production";

	const allCommands: AnyCommand[] = [...(options.commands ?? [])];
	for (const plugin of plugins) {
		if (plugin.commands) allCommands.push(...plugin.commands);
	}

	const legacyEnabled = options.legacy?.enabled === true;
	const legacyPrefix = options.legacy?.defaultPrefix ?? "!";
	const storageFeatures = resolveStorageFeatures(options.storageFeatures, legacyEnabled);

	const dispatcher = new Dispatcher({
		botOwners: options.botOwners ?? [],
		globalValidators: options.validators ?? [],
		canRunCommand: options.canRunCommand,
		cacheAdapter: options.cacheAdapter,
		storage: options.storage,
		storageFeatures: {
			disabledCommands: storageFeatures.disabledCommands,
			channelLocks: storageFeatures.channelLocks,
		},
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

	const handleMessage = async (message: Message): Promise<void> => {
		let prefix = legacyPrefix;
		if (storageFeatures.guildPrefixes && options.storage && message.guild) {
			try {
				const override = await getGuildPrefix(options.storage, message.guild.id);
				if (override) prefix = override;
			} catch (err) {
				console.error("[djs-commands] Failed to load guild prefix override:", err);
			}
		}
		await dispatcher.dispatchMessage(message, prefix, legacyEnabled);
	};

	const onMessage = (message: Message) => {
		handleMessage(message).catch((err) => {
			console.error("[djs-commands] Unhandled legacy command error:", err);
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

	const loadedEventListeners: { event: string; handler: (...args: unknown[]) => void }[] = [];
	let watchHandle: WatchHandle | null = null;

	const detachRuntimeListeners = () => {
		options.client.off(Events.InteractionCreate, onInteraction);
		options.client.off(Events.ClientReady, onReady);
		if (legacyEnabled) {
			options.client.off(Events.MessageCreate, onMessage);
		}
		watchHandle?.stop();
		watchHandle = null;
		for (const { event, handler } of loadedEventListeners) {
			options.client.off(event, handler);
		}
		loadedEventListeners.length = 0;
	};

	const bootPromise = (async () => {
		try {
			assertConfiguredStorage(options.storage, storageFeatures);

			options.client.on(Events.InteractionCreate, onInteraction);
			options.client.once(Events.ClientReady, onReady);
			if (legacyEnabled) {
				options.client.on(Events.MessageCreate, onMessage);
			}

			// Load fs-discovered commands first so they're registered before plugin setup runs.
			if (options.commandDir) {
				const discovered = await loadCommandsFromDir(options.commandDir);
				for (const command of discovered) {
					allCommands.push(command);
					dispatcher.register(command);
				}
			}

			if (options.eventDir) {
				const events = await loadEventsFromDir(options.eventDir);
				for (const evt of events) {
					registerEvent(options.client, evt, loadedEventListeners);
				}
			}

			if (dev && options.commandDir) {
				watchHandle = watchCommandsDir(options.commandDir, {
					onCommandChange: (file, command) => {
						if (!command) {
							console.warn(`[djs-commands] ${file} changed but no longer exports a valid command`);
							return;
						}
						dispatcher.register(command);
						console.log(`[djs-commands] hot-reloaded ${command.name}`);
					},
				});
			}

			for (const plugin of plugins) {
				if (!plugin.setup) continue;
				try {
					await plugin.setup({ client: options.client });
				} catch (err) {
					throw new Error(`[djs-commands] Plugin '${plugin.name}' setup failed: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
				}
			}
		} catch (err) {
			detachRuntimeListeners();
			throw err;
		}
	})();

	return {
		destroy: async () => {
			detachRuntimeListeners();
			// Wait for boot to settle so we don't tear down mid-setup. Boot errors
			// are surfaced via `ready`; destroy still tears plugins down.
			await bootPromise.catch(() => {});
			detachRuntimeListeners();
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

function resolveStorageFeatures(features: StorageFeaturesConfig | undefined, legacyEnabled: boolean): Required<StorageFeaturesConfig> {
	return {
		guildPrefixes: features?.guildPrefixes ?? legacyEnabled,
		disabledCommands: features?.disabledCommands ?? false,
		channelLocks: features?.channelLocks ?? false,
	};
}

function assertConfiguredStorage(storage: CommandHandlerOptions["storage"], features: Required<StorageFeaturesConfig>): void {
	const requiredModels: FrameworkStorageModel[] = [];
	if (features.guildPrefixes) requiredModels.push(GuildPrefixModel);
	if (features.disabledCommands) requiredModels.push(DisabledCommandsModel);
	if (features.channelLocks) requiredModels.push(ChannelLocksModel);
	if (requiredModels.length === 0) return;
	if (!storage) {
		throw new Error(`[djs-commands] storage is required for enabled storage features: ${requiredModels.join(", ")}`);
	}
	storage.assertModels?.(requiredModels);
}

function registerEvent(client: Client, evt: EventDefinition, listeners: { event: string; handler: (...args: unknown[]) => void }[]): void {
	const handler = ((...args: unknown[]) => {
		const result = (evt.handler as (...a: unknown[]) => void | Promise<void>)(...args);
		if (result && typeof (result as Promise<void>).catch === "function") {
			(result as Promise<void>).catch((err) => {
				console.error(`[djs-commands] Event '${String(evt.event)}' handler error:`, err);
			});
		}
	}) as (...args: unknown[]) => void;
	if (evt.once) client.once(evt.event, handler);
	else client.on(evt.event, handler);
	listeners.push({ event: evt.event, handler });
}
