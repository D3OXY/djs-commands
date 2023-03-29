"use strict";
module.exports = async (command, usage) => {
    const { guild, message, interaction } = usage;
    const { commandName, instance } = command;
    if (!guild)
        return true;
    if (instance.commandHandler.disabledCommands.isDisabled(guild.id, commandName)) {
        if (message) {
            await message.reply("This command is disabled on this server.");
        }
        else {
            await interaction.reply("This command is disabled on this server.");
        }
        return false;
    }
    return true;
};
