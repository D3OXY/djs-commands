import type { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";
import type { CommandOptions, ResolveOptions } from "./options";
import type { LegacyRunContext, SlashRunContext } from "./types";

/** Converts a discord.js chat-input interaction into the command run context shape. */
export function normalizeSlashContext<S extends CommandOptions>(interaction: ChatInputCommandInteraction, options: ResolveOptions<S>): SlashRunContext<S> {
	return {
		type: "slash",
		interaction,
		client: interaction.client,
		author: interaction.user,
		guild: interaction.guild,
		member: interaction.member as GuildMember | null,
		channel: interaction.channel,
		channelId: interaction.channelId,
		options,
		reply: (content) => interaction.reply(content as Parameters<ChatInputCommandInteraction["reply"]>[0]),
	};
}

/** Converts a discord.js message into the legacy command run context shape. */
export function normalizeLegacyContext<S extends CommandOptions>(message: Message, options: ResolveOptions<S>): LegacyRunContext<S> {
	return {
		type: "legacy",
		message,
		client: message.client,
		author: message.author,
		guild: message.guild,
		member: message.member,
		channel: message.channel,
		channelId: message.channelId,
		options,
		reply: (content) => message.reply(content as Parameters<Message["reply"]>[0]),
	};
}
