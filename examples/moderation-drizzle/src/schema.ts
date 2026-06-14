import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const guildPrefixes = pgTable("guild_prefixes", {
	guildId: text("guild_id").primaryKey(),
	prefix: text("prefix").notNull(),
});

export const disabledCommands = pgTable(
	"disabled_commands",
	{
		guildId: text("guild_id").notNull(),
		commandName: text("command_name").notNull(),
	},
	(t) => [primaryKey({ columns: [t.guildId, t.commandName] })]
);

export const channelLocks = pgTable(
	"channel_locks",
	{
		guildId: text("guild_id").notNull(),
		commandName: text("command_name").notNull(),
		channelId: text("channel_id").notNull(),
	},
	(t) => [primaryKey({ columns: [t.guildId, t.commandName, t.channelId] })]
);
