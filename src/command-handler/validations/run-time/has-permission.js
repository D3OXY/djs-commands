const { PermissionFlagsBits } = require('discord.js');

const keys = Object.keys(PermissionFlagsBits);

module.exports = (command, usage) => {
    const { permissions = [] } = command.commandObject
    const { member, message, interaction } = usage

    if (member && permissions.length) {
        const missingPermissions = [];

        for (const permission of permissions) {
            if (!member.permissions.has(permission)) {
                const permissionName = keys.find(key => PermissionFlagsBits[key] === permission);
                missingPermissions.push(permissionName);
            }
        }

        if (missingPermissions.length) {
            const text = `You are missing the following permissions: ${missingPermissions.join(', ')}`

            if (message) {
                message.reply(text);
            } else if (interaction) {
                interaction.reply(text);
            }
            return;
        }
    }

    return true;
}