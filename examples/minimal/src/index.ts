import { createCommandHandler, defineCommand } from "@djs-commands/core";
import { Client, GatewayIntentBits } from "discord.js";
import { echoPlugin } from "./echo-plugin";

// One definition, two invocation styles: `/ping` (slash) and `!ping` (legacy).
// `ctx.reply` works for both. Use `ctx.type` to narrow if you need raw access
// to ctx.interaction or ctx.message.
const ping = defineCommand({
	name: "ping",
	description: "Replies with pong",
	cooldown: { type: "perUser", duration: 5_000 },
	legacy: { enabled: true, aliases: ["p"] },
	run: async (ctx) => {
		await ctx.reply("pong");
	},
});

// Demonstrates validators: gated by ownerOnly + guildOnly.
// The framework auto-replies ephemerally with the failure reason if
// validation fails, so the run handler only sees authorized invocations.
const shutdown = defineCommand({
	name: "shutdown",
	description: "Owner-only command (demo)",
	ownerOnly: true,
	guildOnly: true,
	run: async (ctx) => {
		await ctx.reply("Pretending to shut down…");
	},
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
	console.error("DISCORD_TOKEN environment variable is required");
	process.exit(1);
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const handler = createCommandHandler({
	client,
	commands: [ping, shutdown],
	plugins: [echoPlugin()],
	// Comma-separated user IDs allowed to run owner-gated commands.
	botOwners:
		process.env.BOT_OWNERS?.split(",")
			.map((id) => id.trim())
			.filter(Boolean) ?? [],
	legacy: { enabled: true, defaultPrefix: "!" },
});

handler.ready.catch((err) => {
	console.error("Plugin boot failed:", err);
	process.exit(1);
});

client.once("clientReady", (c) => {
	console.log(`Logged in as ${c.user.tag}`);
});

await client.login(token);
