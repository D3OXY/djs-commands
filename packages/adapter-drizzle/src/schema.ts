import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

/** Drizzle Postgres schema for the framework's GuildPrefix model. */
export const guildPrefix = pgTable("guild_prefix", {
	guildId: text("guild_id").primaryKey(),
	prefix: text("prefix").notNull(),
});

export type GuildPrefixRow = typeof guildPrefix.$inferSelect;

/** Per-guild kill switch for a command. */
export const disabledCommands = pgTable(
	"disabled_commands",
	{
		guildId: text("guild_id").notNull(),
		commandName: text("command_name").notNull(),
	},
	(t) => [primaryKey({ columns: [t.guildId, t.commandName] })]
);

export type DisabledCommandRow = typeof disabledCommands.$inferSelect;

/** Per-guild allow-list of channels a command may run in. */
export const channelLocks = pgTable(
	"channel_locks",
	{
		guildId: text("guild_id").notNull(),
		commandName: text("command_name").notNull(),
		channelId: text("channel_id").notNull(),
	},
	(t) => [primaryKey({ columns: [t.guildId, t.commandName, t.channelId] })]
);

export type ChannelLockRow = typeof channelLocks.$inferSelect;
