import { drizzleStorage } from "@djs-commands/adapter-drizzle";
import { ChannelLocksModel, createCommandHandler, DisabledCommandsModel, defineCommand, GuildPrefixModel } from "@djs-commands/core";
import { Client, GatewayIntentBits } from "discord.js";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { channelLocks, disabledCommands, guildPrefixes } from "./schema";

const token = process.env.DISCORD_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
if (!token || !databaseUrl) {
	console.error("DISCORD_TOKEN and DATABASE_URL environment variables are required");
	process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

const ban = defineCommand({
	name: "ban",
	description: "Ban a user from the server",
	guildOnly: true,
	permissions: ["BanMembers"],
	options: {
		user: { type: "user", description: "Who to ban", required: true },
		reason: { type: "string", description: "Why" },
	},
	run: async (ctx) => {
		await ctx.reply(`Banned ${ctx.options.user.tag}${ctx.options.reason ? ` (${ctx.options.reason})` : ""} (demo).`);
	},
});

const kick = defineCommand({
	name: "kick",
	description: "Kick a user from the server",
	guildOnly: true,
	permissions: ["KickMembers"],
	options: {
		user: { type: "user", description: "Who to kick", required: true },
		reason: { type: "string", description: "Why" },
	},
	run: async (ctx) => {
		await ctx.reply(`Kicked ${ctx.options.user.tag}${ctx.options.reason ? ` (${ctx.options.reason})` : ""} (demo).`);
	},
});

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const handler = createCommandHandler({
	client,
	commands: [ban, kick],
	storage: drizzleStorage(db, {
		models: {
			[GuildPrefixModel]: {
				table: guildPrefixes,
				fields: { guild_id: guildPrefixes.guildId, prefix: guildPrefixes.prefix },
			},
			[DisabledCommandsModel]: {
				table: disabledCommands,
				fields: { guild_id: disabledCommands.guildId, command_name: disabledCommands.commandName },
			},
			[ChannelLocksModel]: {
				table: channelLocks,
				fields: { guild_id: channelLocks.guildId, command_name: channelLocks.commandName, channel_id: channelLocks.channelId },
			},
		},
	}),
	legacy: { enabled: true, defaultPrefix: "!" },
});

handler.ready.catch((err) => {
	console.error("Boot failed:", err);
	process.exit(1);
});

client.once("clientReady", (c) => {
	console.log(`Logged in as ${c.user.tag}`);
});

await client.login(token);
