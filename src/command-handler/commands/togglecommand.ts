import { CommandUsage } from "../../../typings";
import CommandType from "../../utils/CommandType";
import Command from "../Command";

import { PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
module.exports = {
    description: "Toggle a command on or off.",
    type: CommandType.SLASH,
    testOnly: true,
    guildOnly: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: "command",
            description: "The command to toggle.",
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true
        }
    ],
    autocomplete: (command: Command) => {
        return [...command.instance.commandHandler.commands.keys()]
    },
    callback: async ({ instance, guild, text: commandName, interaction }: CommandUsage) => {
        const { disabledCommands } = instance.commandHandler;

        if (disabledCommands.isDisabled(guild!.id, commandName)) {
            await disabledCommands.enable(guild!.id, commandName);
            return interaction!.reply(`Enabled \`${commandName}\`!`)
        } else {
            await disabledCommands.disable(guild!.id, commandName);
            return interaction!.reply(`Disabled \`${commandName}\`!`)
        }
    }
}