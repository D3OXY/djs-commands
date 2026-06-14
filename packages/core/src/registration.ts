import type { ApplicationCommandDataResolvable } from "discord.js";
import { buildOptionsData } from "./options";
import type { AnyCommand } from "./types";

export type RegistrationScopeMode = "sync" | "clear" | "ignore";

export type RegistrationScopeConfig = RegistrationScopeMode | { mode: RegistrationScopeMode };

export type RegistrationGuildScopeConfig = string | { id: string; mode?: RegistrationScopeMode };

export type CommandGuildRegistrationConfig =
	| boolean
	| readonly string[]
	| {
			include?: readonly string[];
			exclude?: readonly string[];
	  };

export type CommandRegistrationConfig =
	| false
	| {
			global?: boolean;
			guilds?: CommandGuildRegistrationConfig;
	  };

export type HandlerRegistrationConfig =
	| false
	| {
			enabled?: boolean;
			global?: RegistrationScopeConfig;
			guilds?: readonly RegistrationGuildScopeConfig[];
	  };

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

export interface RegistrationPlan {
	operations: RegistrationPlanOperation[];
}

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
