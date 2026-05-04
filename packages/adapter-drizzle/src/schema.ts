import { pgTable, text } from "drizzle-orm/pg-core";

/** Drizzle Postgres schema for the framework's GuildPrefix model. */
export const guildPrefix = pgTable("guild_prefix", {
	guildId: text("guild_id").primaryKey(),
	prefix: text("prefix").notNull(),
});

export type GuildPrefixRow = typeof guildPrefix.$inferSelect;
