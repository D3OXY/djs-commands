"use strict";
const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    description: 'Deletes a custom command',
    minArgs: 1,
    syntaxError: 'Correct syntax: {PREFIX}delcustomcommand {ARGS}',
    expectedArgs: '<command name>',
    type: 'SLASH',
    guildOnly: true,
    testOnly: true,
    permissions: [PermissionFlagsBits.Administrator],
    callback: async ({ instance, text: commandName, guild }) => {
        await instance.commandHandler.customCommands.delete(guild.id, commandName);
        return `Custom command "${commandName}" has been deleted!`;
    },
};
