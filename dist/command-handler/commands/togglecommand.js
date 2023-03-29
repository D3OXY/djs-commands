"use strict";
const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");
module.exports = {
    description: "Toggle a command on or off.",
    type: "SLASH",
    testOnly: true,
    guildOnly: true,
    permissions: [PermissionFlagsBits.ADMINISTRATOR],
    options: [
        {
            name: "command",
            description: "The command to toggle.",
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true
        }
    ],
    autocomplete: (_, command) => {
        return [...command.instance.commandHandler.commands.keys()];
    },
    callback: async ({ instance, guild, text: commandName, interaction }) => {
        const { disabledCommands } = instance.commandHandler;
        if (disabledCommands.isDisabled(guild.id, commandName)) {
            await disabledCommands.enable(guild.id, commandName);
            return interaction.reply(`Enabled \`${commandName}\`!`);
        }
        else {
            await disabledCommands.disable(guild.id, commandName);
            return interaction.reply(`Disabled \`${commandName}\`!`);
        }
    }
};
