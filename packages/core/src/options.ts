import { ApplicationCommandOptionType, type Attachment, type ChatInputCommandInteraction, type GuildBasedChannel, type GuildMember, type Role, type User } from "discord.js";

/** Slash/legacy text option. Required options resolve to `string`; optional ones resolve to `string | undefined`. */
export type StringOption = {
	/** Discord option discriminator. */
	type: "string";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
	/** Literal choices accepted by Discord and legacy parsing. */
	choices?: readonly string[];
};

/** Whole-number slash/legacy option. Choices are preserved as numeric literal unions. */
export type IntegerOption = {
	/** Discord option discriminator. */
	type: "integer";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
	/** Literal integer choices accepted by Discord and legacy parsing. */
	choices?: readonly number[];
};

/** Floating-point slash/legacy number option. */
export type NumberOption = {
	/** Discord option discriminator. */
	type: "number";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
};

/** Boolean slash/legacy option. Legacy mode accepts true/false, yes/no, y/n, 1/0, and on/off. */
export type BooleanOption = {
	/** Discord option discriminator. */
	type: "boolean";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
};

/** Discord user option. Legacy mode accepts user mentions or IDs already cached by discord.js. */
export type UserOption = {
	/** Discord option discriminator. */
	type: "user";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
};

/** Discord guild channel option. Legacy mode accepts channel mentions or IDs from the current guild cache. */
export type ChannelOption = {
	/** Discord option discriminator. */
	type: "channel";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
};

/** Discord role option. Legacy mode accepts role mentions or IDs from the current guild cache. */
export type RoleOption = {
	/** Discord option discriminator. */
	type: "role";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
};

/** Discord mentionable option, resolving to a user, guild member, or role. */
export type MentionableOption = {
	/** Discord option discriminator. */
	type: "mentionable";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
};

/** Discord attachment option. Legacy mode reads the first message attachment. */
export type AttachmentOption = {
	/** Discord option discriminator. */
	type: "attachment";
	/** Shown by Discord in slash-command UI. */
	description: string;
	/** Whether Discord requires the value for slash invocations. */
	required?: boolean;
};

/** Any supported command option schema entry. */
export type CommandOption = StringOption | IntegerOption | NumberOption | BooleanOption | UserOption | ChannelOption | RoleOption | MentionableOption | AttachmentOption;

/** Named command option schema passed to `defineCommand({ options })`. */
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

/** Runtime value type for one option; optional options include `undefined`. */
export type ResolveOption<O extends CommandOption> = O extends { required: true } ? ResolveValue<O> : ResolveValue<O> | undefined;

/** Runtime `ctx.options` object inferred from a command option schema. */
export type ResolveOptions<S extends CommandOptions> = {
	[K in keyof S]: ResolveOption<S[K]>;
};

const nullToUndefined = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

/** Extracts typed slash-command values from a Discord interaction using a command schema. */
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

/** Converts a command option schema into Discord application-command option data. */
export function buildOptionsData(schema: CommandOptions | undefined): DiscordOptionData[] | undefined {
	if (!schema) return undefined;
	return Object.entries(schema).map(([name, opt]) => buildOptionData(name, opt));
}
