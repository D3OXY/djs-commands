import type { ClientEvents } from "discord.js";

export interface EventDefinition<E extends keyof ClientEvents = keyof ClientEvents> {
	event: E;
	once?: boolean;
	handler: (...args: ClientEvents[E]) => void | Promise<void>;
}

export function defineEvent<E extends keyof ClientEvents>(def: EventDefinition<E>): EventDefinition<E> {
	return def;
}
