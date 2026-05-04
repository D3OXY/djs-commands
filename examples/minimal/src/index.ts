import { createCommandHandler, defineCommand } from "@djs-commands/core";
import { Client, GatewayIntentBits } from "discord.js";
import { echoPlugin } from "./echo-plugin";

const ping = defineCommand({
	name: "ping",
	description: "Replies with pong",
	cooldown: { type: "perUser", duration: 5_000 },
	run: async ({ interaction }) => {
		await interaction.reply("pong");
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
	run: async ({ interaction }) => {
		await interaction.reply("Pretending to shut down…");
	},
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
	console.error("DISCORD_TOKEN environment variable is required");
	process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const handler = createCommandHandler({
	client,
	commands: [ping, shutdown],
	plugins: [echoPlugin()],
	// Comma-separated user IDs allowed to run owner-gated commands.
	botOwners:
		process.env.BOT_OWNERS?.split(",")
			.map((id) => id.trim())
			.filter(Boolean) ?? [],
});

handler.ready.catch((err) => {
	console.error("Plugin boot failed:", err);
	process.exit(1);
});

client.once("clientReady", (c) => {
	console.log(`Logged in as ${c.user.tag}`);
});

await client.login(token);
