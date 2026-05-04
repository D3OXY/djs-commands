import { fileURLToPath } from "node:url";
import { createCommandHandler } from "@djs-commands/core";
import { Client, GatewayIntentBits } from "discord.js";
import { echoPlugin } from "./echo-plugin";

const token = process.env.DISCORD_TOKEN;
if (!token) {
	console.error("DISCORD_TOKEN environment variable is required");
	process.exit(1);
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// `commandDir` walks the directory recursively, dynamically importing each
// module's default export. Hot reload is on automatically when NODE_ENV !==
// "production". Existing commands continue to work via `commands: [...]`
// alongside the directory loader.
const handler = createCommandHandler({
	client,
	commandDir: fileURLToPath(new URL("./commands", import.meta.url)),
	plugins: [echoPlugin()],
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
