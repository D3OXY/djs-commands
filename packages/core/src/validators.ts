import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { AnyCommand } from "./types";

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export interface ValidatorContext {
	interaction: ChatInputCommandInteraction;
	command: AnyCommand;
	botOwners: readonly string[];
}

export type Validator = (ctx: ValidatorContext) => ValidationResult | Promise<ValidationResult>;

export type CanRunCommand = (interaction: ChatInputCommandInteraction) => boolean | string | Promise<boolean | string>;

const ownerOnly: Validator = ({ command, interaction, botOwners }) => {
	if (!command.ownerOnly) return { ok: true };
	if (botOwners.includes(interaction.user.id)) return { ok: true };
	return { ok: false, reason: "This command is restricted to bot owners." };
};

const guildOnly: Validator = ({ command, interaction }) => {
	if (!command.guildOnly) return { ok: true };
	if (interaction.guild) return { ok: true };
	return { ok: false, reason: "This command can only be used in a server." };
};

const channelOnly: Validator = ({ command, interaction }) => {
	const allowed = command.channels;
	if (!allowed?.length) return { ok: true };
	if (allowed.includes(interaction.channelId)) return { ok: true };
	return { ok: false, reason: "This command isn't allowed in this channel." };
};

const permissions: Validator = ({ command, interaction }) => {
	const required = command.permissions;
	if (!required?.length) return { ok: true };
	if (!interaction.guild) {
		return { ok: false, reason: "Permission checks require a server context." };
	}
	const member = interaction.member as GuildMember | null;
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

const roles: Validator = ({ command, interaction }) => {
	const required = command.roles;
	if (!required?.length) return { ok: true };
	if (!interaction.guild) {
		return { ok: false, reason: "Role checks require a server context." };
	}
	const member = interaction.member as GuildMember | null;
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

export async function runValidatorChain(ctx: ValidatorContext, options: ValidatorChainOptions = {}): Promise<ValidationResult> {
	const commandValidators = ctx.command.validators ?? [];
	const allValidators = [...BUILTIN_VALIDATORS, ...(options.globalValidators ?? []), ...commandValidators];

	for (const v of allValidators) {
		const result = await v(ctx);
		if (!result.ok) return result;
	}

	if (options.canRunCommand) {
		const r = await options.canRunCommand(ctx.interaction);
		if (r === false) return { ok: false, reason: "You can't run this command right now." };
		if (typeof r === "string") return { ok: false, reason: r };
	}

	return { ok: true };
}
