import type { Client } from "discord.js";
import type { AnyCommand } from "./types";

/**
 * Context passed to a plugin's `setup` hook. Kept intentionally small —
 * plugins that need richer state should attach it to `client` or close
 * over their own values.
 */
export interface PluginSetupContext {
	/** Discord.js client controlled by the handler. */
	client: Client;
}

/**
 * Manifest returned by a plugin factory. Registered on `createCommandHandler`
 * via the `plugins` option.
 */
export interface PluginManifest {
	/** Human-readable identifier; used in error messages and lifecycle ordering. */
	name: string;
	/** Commands merged into the handler's dispatcher at boot. */
	commands?: AnyCommand[];
	/** Awaited at boot in registration order. Throwing aborts handler boot. */
	setup?: (ctx: PluginSetupContext) => void | Promise<void>;
	/** Awaited on `handler.destroy()`. Errors are logged but do not block other teardowns. */
	teardown?: () => void | Promise<void>;
	// validators?: Validator[]; // pending #54
	// events?: EventHandler[]; // pending future event-handler slice
}
