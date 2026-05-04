import { createCommandHandler, defineCommand } from "@djs-commands/core";
import { Client, GatewayIntentBits } from "discord.js";

const ping = defineCommand({
	name: "ping",
	description: "Replies with pong",
	run: async ({ interaction }) => {
		await interaction.reply("pong");
	},
});

const echo = defineCommand({
	name: "echo",
	description: "Echoes a message back",
	options: {
		message: { type: "string", description: "What to echo", required: true },
	},
	run: async ({ interaction, options }) => {
		// options.message is statically typed as `string` (required)
		await interaction.reply(options.message);
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

createCommandHandler({
	client,
	commands: [ping, echo, shutdown],
	// Comma-separated user IDs allowed to run owner-gated commands.
	botOwners:
		process.env.BOT_OWNERS?.split(",")
			.map((id) => id.trim())
			.filter(Boolean) ?? [],
});

client.once("clientReady", (c) => {
	console.log(`Logged in as ${c.user.tag}`);
});

await client.login(token);
