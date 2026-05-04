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

const token = process.env.DISCORD_TOKEN;
if (!token) {
	console.error("DISCORD_TOKEN environment variable is required");
	process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

createCommandHandler({
	client,
	commands: [ping, echo],
});

client.once("clientReady", (c) => {
	console.log(`Logged in as ${c.user.tag}`);
});

await client.login(token);
