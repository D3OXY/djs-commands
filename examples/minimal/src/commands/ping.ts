import { defineCommand } from "@djs-commands/core";

export default defineCommand({
	name: "ping",
	description: "Replies with pong",
	cooldown: { type: "perUser", duration: 5_000 },
	legacy: { enabled: true, aliases: ["p"] },
	run: async (ctx) => {
		await ctx.reply("pong");
	},
});
