import mongoose from "mongoose";

const SCHEMA_OPTS = {
	// Disable Mongo's auto-`_id` so document shapes match the framework's
	// `Record<string, unknown>` row contract exactly.
	_id: false,
	// Disable the version key (`__v`) for the same reason.
	versionKey: false,
} as const;

// ─── GuildPrefix ───────────────────────────────────────────────────────────

export interface GuildPrefixDoc {
	guild_id: string;
	prefix: string;
}

const guildPrefixSchema = new mongoose.Schema<GuildPrefixDoc>(
	{
		guild_id: { type: String, required: true, unique: true },
		prefix: { type: String, required: true },
	},
	{ ...SCHEMA_OPTS, collection: "guild_prefix" }
);

export function createGuildPrefixModel(connection: mongoose.Connection): mongoose.Model<GuildPrefixDoc> {
	const existing = connection.models.GuildPrefix as mongoose.Model<GuildPrefixDoc> | undefined;
	if (existing) return existing;
	return connection.model<GuildPrefixDoc>("GuildPrefix", guildPrefixSchema);
}

// ─── DisabledCommands ──────────────────────────────────────────────────────

export interface DisabledCommandDoc {
	guild_id: string;
	command_name: string;
}

const disabledCommandSchema = new mongoose.Schema<DisabledCommandDoc>(
	{
		guild_id: { type: String, required: true },
		command_name: { type: String, required: true },
	},
	{ ...SCHEMA_OPTS, collection: "disabled_commands" }
);
disabledCommandSchema.index({ guild_id: 1, command_name: 1 }, { unique: true });

export function createDisabledCommandModel(connection: mongoose.Connection): mongoose.Model<DisabledCommandDoc> {
	const existing = connection.models.DisabledCommand as mongoose.Model<DisabledCommandDoc> | undefined;
	if (existing) return existing;
	return connection.model<DisabledCommandDoc>("DisabledCommand", disabledCommandSchema);
}

// ─── ChannelLocks ──────────────────────────────────────────────────────────

export interface ChannelLockDoc {
	guild_id: string;
	command_name: string;
	channel_id: string;
}

const channelLockSchema = new mongoose.Schema<ChannelLockDoc>(
	{
		guild_id: { type: String, required: true },
		command_name: { type: String, required: true },
		channel_id: { type: String, required: true },
	},
	{ ...SCHEMA_OPTS, collection: "channel_locks" }
);
channelLockSchema.index({ guild_id: 1, command_name: 1, channel_id: 1 }, { unique: true });

export function createChannelLockModel(connection: mongoose.Connection): mongoose.Model<ChannelLockDoc> {
	const existing = connection.models.ChannelLock as mongoose.Model<ChannelLockDoc> | undefined;
	if (existing) return existing;
	return connection.model<ChannelLockDoc>("ChannelLock", channelLockSchema);
}
