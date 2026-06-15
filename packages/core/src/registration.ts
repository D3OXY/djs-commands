import type { ApplicationCommandDataResolvable } from "discord.js";
import { buildOptionsData } from "./options";
import type { AnyCommand } from "./types";

/** Registration behavior for a Discord application-command scope. */
export type RegistrationScopeMode = "sync" | "clear" | "ignore";

/** Handler registration setting for one scope. `sync` overwrites, `clear` empties, `ignore` leaves untouched. */
export type RegistrationScopeConfig = RegistrationScopeMode | { mode: RegistrationScopeMode };

/** Guild registration target. Guild sync is fast and best for development; global sync can take time to propagate. */
export type RegistrationGuildScopeConfig = string | { id: string; mode?: RegistrationScopeMode };

/** Per-command guild registration override. */
export type CommandGuildRegistrationConfig =
	| boolean
	| readonly string[]
	| {
			include?: readonly string[];
			exclude?: readonly string[];
	  };

/** Per-command registration override. `false` loads the command for dispatch but excludes it from handler-managed Discord registration. */
export type CommandRegistrationConfig =
	| false
	| {
			/** Include or exclude this command from global registration. Defaults to true. */
			global?: boolean;
			/** Include, exclude, or fully disable this command for configured guild scopes. */
			guilds?: CommandGuildRegistrationConfig;
	  };

/**
 * Handler-wide Discord registration plan.
 *
 * Omit for global `sync`. Use guild `sync` for near-instant development.
 * Global command changes can take time to appear in Discord. `sync` and
 * `clear` overwrite the configured scope; `ignore` leaves existing commands
 * untouched. Pass `false` to disable framework registration entirely.
 */
export type HandlerRegistrationConfig =
	| false
	| {
			/** Master switch. `false` is equivalent to `registration: false`. */
			enabled?: boolean;
			/** Global command behavior. */
			global?: RegistrationScopeConfig;
			/** Guild command behavior for each guild ID. */
			guilds?: readonly RegistrationGuildScopeConfig[];
	  };

/** One concrete operation produced by `createRegistrationPlan`. */
export type RegistrationPlanOperation =
	| {
			scope: "global";
			mode: "sync" | "clear";
			commands: ApplicationCommandDataResolvable[];
	  }
	| {
			scope: "guild";
			guildId: string;
			mode: "sync" | "clear";
			commands: ApplicationCommandDataResolvable[];
	  };

/** Registration operations ready to apply to Discord. */
export interface RegistrationPlan {
	/** Ordered scope operations. Empty means registration is disabled or all scopes are ignored. */
	operations: RegistrationPlanOperation[];
}

/** Creates a Discord registration plan without calling Discord. Useful for tests and dry runs. */
export function createRegistrationPlan(commands: readonly AnyCommand[], registration?: HandlerRegistrationConfig): RegistrationPlan {
	const scopes = resolveManagedScopes(registration);
	return {
		operations: scopes.map((scope) => {
			if (scope.mode === "clear") {
				return scope.scope === "global" ? { scope: "global", mode: "clear", commands: [] } : { scope: "guild", guildId: scope.guildId, mode: "clear", commands: [] };
			}
			const data = commands.filter((command) => commandIncludedInScope(command.registration, scope)).map(commandToApplicationData);
			return scope.scope === "global" ? { scope: "global", mode: "sync", commands: data } : { scope: "guild", guildId: scope.guildId, mode: "sync", commands: data };
		}),
	};
}

type ManagedScope = { scope: "global"; mode: "sync" | "clear" } | { scope: "guild"; guildId: string; mode: "sync" | "clear" };

type SyncScope = { scope: "global" } | { scope: "guild"; guildId: string };

function resolveManagedScopes(registration?: HandlerRegistrationConfig): ManagedScope[] {
	if (registration === false || registration?.enabled === false) return [];
	if (registration === undefined) return [{ scope: "global", mode: "sync" }];

	const scopes: ManagedScope[] = [];
	if (registration.global !== undefined) {
		const mode = resolveScopeMode(registration.global);
		if (mode !== "ignore") scopes.push({ scope: "global", mode });
	}

	for (const guild of registration.guilds ?? []) {
		const id = typeof guild === "string" ? guild : guild.id;
		const mode = typeof guild === "string" ? "sync" : (guild.mode ?? "sync");
		if (mode !== "ignore") scopes.push({ scope: "guild", guildId: id, mode });
	}

	return scopes;
}

function resolveScopeMode(config: RegistrationScopeConfig): RegistrationScopeMode {
	return typeof config === "string" ? config : config.mode;
}

function commandsMatchGuildConfig(config: CommandGuildRegistrationConfig | undefined, guildId: string): boolean {
	if (config === undefined) return true;
	if (typeof config === "boolean") return config;
	if (isGuildList(config)) return config.includes(guildId);
	if (config.exclude?.includes(guildId)) return false;
	if (config.include) return config.include.includes(guildId);
	return true;
}

function isGuildList(config: CommandGuildRegistrationConfig): config is readonly string[] {
	return Array.isArray(config);
}

function commandIncludedInScope(registration: CommandRegistrationConfig | undefined, scope: SyncScope): boolean {
	if (registration === false) return false;
	if (scope.scope === "global") return registration?.global ?? true;
	return commandsMatchGuildConfig(registration?.guilds, scope.guildId);
}

function commandToApplicationData(command: AnyCommand): ApplicationCommandDataResolvable {
	return {
		name: command.name,
		description: command.description,
		options: buildOptionsData(command.options),
	} as unknown as ApplicationCommandDataResolvable;
}
