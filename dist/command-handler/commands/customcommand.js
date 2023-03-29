"use strict";
const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    description: 'Creates a custom command',
    minArgs: 3,
    syntaxError: 'Correct syntax: {PREFIX}customCommand {ARGS}',
    expectedArgs: '<command name> <description> <response>',
    type: 'SLASH',
    guildOnly: true,
    testOnly: true,
    permissions: [PermissionFlagsBits.Administrator],
    callback: async ({ instance, args, guild }) => {
        const [commandName, description, response] = args;
        await instance.commandHandler.customCommands.create(guild.id, commandName, description, response);
        return `Custom command "${commandName}" has been created!`;
    },
};
