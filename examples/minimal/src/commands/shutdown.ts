import { defineCommand } from "@djs-commands/core";

export default defineCommand({
	name: "shutdown",
	description: "Owner-only command (demo)",
	ownerOnly: true,
	guildOnly: true,
	run: async (ctx) => {
		await ctx.reply("Pretending to shut down…");
	},
});
