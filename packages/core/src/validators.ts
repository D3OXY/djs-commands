import type { ChatInputCommandInteraction, Guild, GuildMember, Message, User } from "discord.js";
import type { AnyCommand } from "./types";

/** Result returned by validators. A failed result replies with `reason`. */
export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Invocation source passed to validators for slash and legacy commands. */
export type ValidatorSource = { type: "slash"; interaction: ChatInputCommandInteraction } | { type: "legacy"; message: Message };

/** Context available to built-in, global, and command-specific validators. */
export interface ValidatorContext {
	/** Command being checked. */
	command: AnyCommand;
	/** Handler-level owner IDs used by `ownerOnly`. */
	botOwners: readonly string[];
	/** Invoking Discord user. */
	user: User;
	/** Guild context, or null in DMs. */
	guild: Guild | null;
	/** Guild member when available. */
	member: GuildMember | null;
	/** Channel ID where the command was invoked. */
	channelId: string;
	/** Raw invocation source. */
	source: ValidatorSource;
}

/** Validator function. Return `{ ok: false, reason }` to stop command execution. */
export type Validator = (ctx: ValidatorContext) => ValidationResult | Promise<ValidationResult>;

/** Lightweight command gate. Return `false` or a string reason to reject. */
export type CanRunCommand = (ctx: ValidatorContext) => boolean | string | Promise<boolean | string>;

const ownerOnly: Validator = ({ command, user, botOwners }) => {
	if (!command.ownerOnly) return { ok: true };
	if (botOwners.includes(user.id)) return { ok: true };
	return { ok: false, reason: "This command is restricted to bot owners." };
};

const guildOnly: Validator = ({ command, guild }) => {
	if (!command.guildOnly) return { ok: true };
	if (guild) return { ok: true };
	return { ok: false, reason: "This command can only be used in a server." };
};

const channelOnly: Validator = ({ command, channelId }) => {
	const allowed = command.channels;
	if (!allowed?.length) return { ok: true };
	if (allowed.includes(channelId)) return { ok: true };
	return { ok: false, reason: "This command isn't allowed in this channel." };
};

const permissions: Validator = ({ command, guild, member }) => {
	const required = command.permissions;
	if (!required?.length) return { ok: true };
	if (!guild) return { ok: false, reason: "Permission checks require a server context." };
	if (!member?.permissions || typeof member.permissions === "string") {
		return { ok: false, reason: "Could not determine your permissions." };
	}
	for (const perm of required) {
		if (!member.permissions.has(perm)) {
			return { ok: false, reason: `Missing permission: ${perm}` };
		}
	}
	return { ok: true };
};

const roles: Validator = ({ command, guild, member }) => {
	const required = command.roles;
	if (!required?.length) return { ok: true };
	if (!guild) return { ok: false, reason: "Role checks require a server context." };
	if (!member?.roles || !("cache" in member.roles)) {
		return { ok: false, reason: "Could not determine your roles." };
	}
	for (const roleId of required) {
		if (!member.roles.cache.has(roleId)) {
			return { ok: false, reason: "You don't have the required role for this command." };
		}
	}
	return { ok: true };
};

const BUILTIN_VALIDATORS: readonly Validator[] = [ownerOnly, guildOnly, channelOnly, permissions, roles];

interface ValidatorChainOptions {
	globalValidators?: readonly Validator[];
	canRunCommand?: CanRunCommand;
}

/** Runs built-in validators, global validators, command validators, then `canRunCommand`. */
export async function runValidatorChain(ctx: ValidatorContext, options: ValidatorChainOptions = {}): Promise<ValidationResult> {
	const commandValidators = ctx.command.validators ?? [];
	const allValidators = [...BUILTIN_VALIDATORS, ...(options.globalValidators ?? []), ...commandValidators];

	for (const v of allValidators) {
		const result = await v(ctx);
		if (!result.ok) return result;
	}

	if (options.canRunCommand) {
		const r = await options.canRunCommand(ctx);
		if (r === false) return { ok: false, reason: "You can't run this command right now." };
		if (typeof r === "string") return { ok: false, reason: r };
	}

	return { ok: true };
}
