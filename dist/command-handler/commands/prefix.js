"use strict";
const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    description: "Sets the prefix for the server.",
    minArgs: 1,
    maxArgs: 1,
    expectedArgs: '<prefix>',
    type: 'BOTH',
    syntaxError: 'Syntax Error: {PREFIX}prefix {ARGS}',
    testOnly: true,
    guildOnly: true,
    permissions: [PermissionFlagsBits.Administrator],
    callback: async ({ instance, guild, text: prefix }) => {
        await instance.commandHandler.prefixHandler.set(guild.id, prefix);
        return `Prefix set to ${prefix}`;
    }
};
