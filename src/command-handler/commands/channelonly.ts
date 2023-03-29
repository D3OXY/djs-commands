import { CommandObject, CommandType, CommandUsage } from "../../../typings";
import Command from "../Command";

import { ApplicationCommandOptionType } from "discord.js";
export default {
    description: "Specify which channels a command can be used in.",
    type: CommandType.SLASH,
    testOnly: true,
    guildOnly: true,
    options: [
        {
            name: "command",
            description: "The command to restrict access to a specific channel.",
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true
        },
        {
            name: "channel",
            description: "The channel to restrict the command to.",
            required: true,
            type: ApplicationCommandOptionType.Channel,
        }
    ],
    autocomplete: (command: Command) => {
        return [...command.instance.commandHandler.commands.keys()]
    },
    callback: async ({ instance, interaction, guild }: CommandUsage) => {
        if (!instance.isConnectedToDB) {
            return {
                content:
                    "This bot is not connected to a database which is required for this command. Please contact the bot owner.",
                ephemeral: true,
            };
        }
        // @ts-ignore
        const commandName = interaction?.options.getString("command");
        // @ts-ignore
        const channel = interaction?.options.getChannel("channel");

        const command = instance.commandHandler.commands.get(commandName.toLowerCase());

        if (!command) return {
            content: `The command "${commandName}" does not exist.`,
            ephemeral: true,
        };

        const { channelCommands } = instance.commandHandler;

        let availableChannels = [];
        const canRun = (await channelCommands.getAvailableChannels(guild!.id, commandName)).includes(channel.id);

        if (canRun) {
            availableChannels = await channelCommands.remove(guild!.id, commandName, channel.id);
        } else {
            availableChannels = await channelCommands.add(guild!.id, commandName, channel.id);
        }

        if (availableChannels.length) {
            const channelNames = availableChannels.map((channelId: string) => `<#${channelId}> `);

            return `The command "${commandName}" can now only be used in the following channels: ${channelNames}`
        }
        return `The command "${commandName}" can now be used in any channel.`
    }
} as CommandObject