"use strict";
module.exports = (command) => {
    const { commandName, commandObject } = command;
    const { guildOnly, permissions = [] } = commandObject;
    if (guildOnly !== true && permissions.length) {
        throw new Error(`Command "${commandName}" is not a guildOnly command but has permissions specified.'`);
    }
};
