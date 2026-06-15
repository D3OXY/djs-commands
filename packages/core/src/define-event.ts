import type { ClientEvents } from "discord.js";

/** Discord.js client event definition loaded by `eventDir` or created manually. */
export interface EventDefinition<E extends keyof ClientEvents = keyof ClientEvents> {
	/** Discord.js event name, such as `clientReady` or `interactionCreate`. */
	event: E;
	/** Register with `client.once` instead of `client.on`. */
	once?: boolean;
	/** Event handler with the exact discord.js argument tuple for `event`. */
	handler: (...args: ClientEvents[E]) => void | Promise<void>;
}

/** Defines a Discord.js client event with typed handler arguments. */
export function defineEvent<E extends keyof ClientEvents>(def: EventDefinition<E>): EventDefinition<E> {
	return def;
}
