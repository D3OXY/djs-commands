import { ApplicationCommandOptionType, type Attachment, type ChatInputCommandInteraction, type GuildBasedChannel, type GuildMember, type Role, type User } from "discord.js";

export type StringOption = {
	type: "string";
	description: string;
	required?: boolean;
	choices?: readonly string[];
};

export type IntegerOption = {
	type: "integer";
	description: string;
	required?: boolean;
	choices?: readonly number[];
};

export type NumberOption = {
	type: "number";
	description: string;
	required?: boolean;
};

export type BooleanOption = {
	type: "boolean";
	description: string;
	required?: boolean;
};

export type UserOption = {
	type: "user";
	description: string;
	required?: boolean;
};

export type ChannelOption = {
	type: "channel";
	description: string;
	required?: boolean;
};

export type RoleOption = {
	type: "role";
	description: string;
	required?: boolean;
};

export type MentionableOption = {
	type: "mentionable";
	description: string;
	required?: boolean;
};

export type AttachmentOption = {
	type: "attachment";
	description: string;
	required?: boolean;
};

export type CommandOption = StringOption | IntegerOption | NumberOption | BooleanOption | UserOption | ChannelOption | RoleOption | MentionableOption | AttachmentOption;

export type CommandOptions = Record<string, CommandOption>;

type ResolveValue<O extends CommandOption> = O extends { type: "string"; choices: readonly (infer C extends string)[] }
	? C
	: O extends { type: "string" }
		? string
		: O extends { type: "integer"; choices: readonly (infer C extends number)[] }
			? C
			: O extends { type: "integer" }
				? number
				: O extends { type: "number" }
					? number
					: O extends { type: "boolean" }
						? boolean
						: O extends { type: "user" }
							? User
							: O extends { type: "channel" }
								? GuildBasedChannel
								: O extends { type: "role" }
									? Role
									: O extends { type: "mentionable" }
										? User | GuildMember | Role
										: O extends { type: "attachment" }
											? Attachment
											: never;

export type ResolveOption<O extends CommandOption> = O extends { required: true } ? ResolveValue<O> : ResolveValue<O> | undefined;

export type ResolveOptions<S extends CommandOptions> = {
	[K in keyof S]: ResolveOption<S[K]>;
};

const nullToUndefined = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

export function extractOptions<S extends CommandOptions>(interaction: ChatInputCommandInteraction, schema: S): ResolveOptions<S> {
	const result: Record<string, unknown> = {};
	for (const [name, opt] of Object.entries(schema)) {
		switch (opt.type) {
			case "string":
				result[name] = nullToUndefined(interaction.options.getString(name));
				break;
			case "integer":
				result[name] = nullToUndefined(interaction.options.getInteger(name));
				break;
			case "number":
				result[name] = nullToUndefined(interaction.options.getNumber(name));
				break;
			case "boolean":
				result[name] = nullToUndefined(interaction.options.getBoolean(name));
				break;
			case "user":
				result[name] = nullToUndefined(interaction.options.getUser(name));
				break;
			case "channel":
				result[name] = nullToUndefined(interaction.options.getChannel(name));
				break;
			case "role":
				result[name] = nullToUndefined(interaction.options.getRole(name));
				break;
			case "mentionable":
				result[name] = nullToUndefined(interaction.options.getMentionable(name));
				break;
			case "attachment":
				result[name] = nullToUndefined(interaction.options.getAttachment(name));
				break;
		}
	}
	return result as ResolveOptions<S>;
}

const OPTION_TYPE_MAP = {
	string: ApplicationCommandOptionType.String,
	integer: ApplicationCommandOptionType.Integer,
	number: ApplicationCommandOptionType.Number,
	boolean: ApplicationCommandOptionType.Boolean,
	user: ApplicationCommandOptionType.User,
	channel: ApplicationCommandOptionType.Channel,
	role: ApplicationCommandOptionType.Role,
	mentionable: ApplicationCommandOptionType.Mentionable,
	attachment: ApplicationCommandOptionType.Attachment,
} as const;

type DiscordOptionData = {
	name: string;
	type: ApplicationCommandOptionType;
	description: string;
	required: boolean;
	choices?: { name: string; value: string | number }[];
};

function buildOptionData(name: string, opt: CommandOption): DiscordOptionData {
	const base: DiscordOptionData = {
		name,
		type: OPTION_TYPE_MAP[opt.type],
		description: opt.description,
		required: opt.required ?? false,
	};
	if ((opt.type === "string" || opt.type === "integer") && opt.choices) {
		base.choices = opt.choices.map((value) => ({ name: String(value), value }));
	}
	return base;
}

export function buildOptionsData(schema: CommandOptions | undefined): DiscordOptionData[] | undefined {
	if (!schema) return undefined;
	return Object.entries(schema).map(([name, opt]) => buildOptionData(name, opt));
}
