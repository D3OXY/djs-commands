"use strict";
module.exports = (command) => {
    const { commandName, commandObject } = command;
    if (!commandObject.callback) {
        throw new Error(`Command "${commandName}" does not have a callback function.`);
    }
};
