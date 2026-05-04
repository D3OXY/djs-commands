import mongoose from "mongoose";

/**
 * Schema shape for the framework's GuildPrefix model. Mongoose works with
 * flexible schemas so we use the framework's snake_case field name (`guild_id`)
 * directly — no camelCase translation layer needed at the boundary.
 */
export interface GuildPrefixDoc {
	guild_id: string;
	prefix: string;
}

const guildPrefixSchema = new mongoose.Schema<GuildPrefixDoc>(
	{
		guild_id: { type: String, required: true, unique: true },
		prefix: { type: String, required: true },
	},
	{
		// Disable Mongo's auto-`_id` so the document shape matches the
		// framework's `Record<string, unknown>` row contract exactly.
		_id: false,
		// Disable the version key (`__v`) for the same reason.
		versionKey: false,
		collection: "guild_prefix",
	}
);

/**
 * Returns a Mongoose model for the framework's GuildPrefix collection bound to
 * the given connection. Calling this multiple times for the same connection is
 * safe — Mongoose caches models by name on the connection.
 */
export function createGuildPrefixModel(connection: mongoose.Connection): mongoose.Model<GuildPrefixDoc> {
	const existing = connection.models.GuildPrefix as mongoose.Model<GuildPrefixDoc> | undefined;
	if (existing) return existing;
	return connection.model<GuildPrefixDoc>("GuildPrefix", guildPrefixSchema);
}
