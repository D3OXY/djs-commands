"use strict";
const { ApplicationCommandOptionType } = require("discord.js");
module.exports = {
    description: "Specify which channels a command can be used in.",
    type: "SLASH",
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
    autocomplete: (_, command) => {
        return [...command.instance.commandHandler.commands.keys()];
    },
    callback: async ({ instance, interaction, guild }) => {
        const commandName = interaction.options.getString("command");
        const channel = interaction.options.getChannel("channel");
        const command = instance.commandHandler.commands.get(commandName.toLowerCase());
        if (!command)
            return `Command "${commandName}" not found.`;
        const { channelCommands } = instance.commandHandler;
        let availableChannels = [];
        const canRun = (await channelCommands.getAvailableChannels(guild.id, commandName)).includes(channel.id);
        if (canRun) {
            availableChannels = await channelCommands.remove(guild.id, commandName, channel.id);
        }
        else {
            availableChannels = await channelCommands.add(guild.id, commandName, channel.id);
        }
        if (availableChannels.length) {
            const channelNames = availableChannels.map((channelId) => `<#${channelId}> `);
            return `The command "${commandName}" can now only be used in the following channels: ${channelNames}`;
        }
        return `The command "${commandName}" can now be used in any channel.`;
    }
};
