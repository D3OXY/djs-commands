import { type ApplicationCommandDataResolvable, type Client, Events, type Interaction, type Message } from "discord.js";
import type { EventDefinition } from "./define-event";
import { Dispatcher } from "./dispatcher";
import { loadCommandEntriesFromDir, loadEventsFromDir, type WatchHandle, watchCommandsDir } from "./fs-loader";
import { createRegistrationPlan, type RegistrationPlan } from "./registration";
import { ChannelLocksModel, DisabledCommandsModel, type FrameworkStorageModel, GuildPrefixModel, getGuildPrefix } from "./storage";
import type { AnyCommand, CommandHandler, CommandHandlerOptions, StorageFeaturesConfig } from "./types";

/**
 * Wires commands, events, validators, cooldowns, plugins, storage, and Discord registration into a client.
 *
 * @remarks
 * Omitted registration syncs global commands, which can take time to appear in Discord.
 * Guild registration is faster for development. Storage-backed gates are opt-in and
 * require mapped models only for enabled `storageFeatures`.
 *
 * @example
 * ```ts
 * const handler = createCommandHandler({
 *   client,
 *   commandDir: "./src/commands",
 *   registration: { guilds: ["123456789012345678"] },
 * });
 * await handler.ready;
 * ```
 */
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

	const commandFiles = new Map<string, string>();
	let readyClient: Client<true> | null = null;

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
		readyClient = client;
		bootPromise
			.then(() => syncRegistration(client, allCommands, options.registration))
			.catch((err) => {
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
				const discovered = await loadCommandEntriesFromDir(options.commandDir);
				for (const { file, command } of discovered) {
					commandFiles.set(file, command.name);
					replaceCommand(allCommands, command);
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
						const previousName = commandFiles.get(file);
						if (!command) {
							if (previousName) {
								removeCommand(allCommands, previousName);
								dispatcher.unregister(previousName);
								commandFiles.delete(file);
								console.log(`[djs-commands] removed ${previousName}`);
								if (readyClient) syncRegistration(readyClient, allCommands, options.registration).catch(logRegistrationError);
								return;
							}
							console.warn(`[djs-commands] ${file} changed but no longer exports a valid command`);
							return;
						}
						if (previousName && previousName !== command.name) {
							removeCommand(allCommands, previousName);
							dispatcher.unregister(previousName);
						}
						replaceCommand(allCommands, command);
						commandFiles.set(file, command.name);
						dispatcher.register(command);
						console.log(`[djs-commands] hot-reloaded ${command.name}`);
						if (readyClient) syncRegistration(readyClient, allCommands, options.registration).catch(logRegistrationError);
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

async function applyRegistrationPlan(client: Client<true>, plan: RegistrationPlan): Promise<void> {
	if (!client.application) return;
	for (const operation of plan.operations) {
		const commands = operation.commands as ApplicationCommandDataResolvable[];
		if (operation.scope === "global") {
			await client.application.commands.set(commands);
		} else {
			const guild = await client.guilds.fetch(operation.guildId);
			await guild.commands.set(commands);
		}
	}
}

async function syncRegistration(client: Client<true>, commands: readonly AnyCommand[], registration: CommandHandlerOptions["registration"]): Promise<void> {
	await applyRegistrationPlan(client, createRegistrationPlan(commands, registration));
}

function logRegistrationError(err: unknown): void {
	console.error("[djs-commands] Failed to register application commands:", err);
}

function replaceCommand(commands: AnyCommand[], command: AnyCommand): void {
	removeCommand(commands, command.name);
	commands.push(command);
}

function removeCommand(commands: AnyCommand[], name: string): void {
	let index = commands.findIndex((command) => command.name === name);
	while (index !== -1) {
		commands.splice(index, 1);
		index = commands.findIndex((command) => command.name === name);
	}
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
