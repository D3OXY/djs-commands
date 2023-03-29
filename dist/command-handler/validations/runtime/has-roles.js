"use strict";
const requiredRoles = require('../../../models/required-roles-schema');
module.exports = async (command, usage) => {
    const { guild, member, message, interaction } = usage;
    if (!member) {
        return true;
    }
    const _id = `${guild.id}-${command.commandName}`;
    const document = await requiredRoles.findById(_id);
    if (document) {
        if (!document.roles.length)
            return true;
        let hasRole = false;
        for (const roleId of document.roles) {
            if (member.roles.cache.has(roleId)) {
                hasRole = true;
                break;
            }
        }
        if (hasRole)
            return true;
        const reply = {
            content: `You are missing the following roles: ${document.roles.map((roleId) => `<@&${roleId}>`)}`,
            allowedMentions: {
                roles: {}
            }
        };
        if (message) {
            message.reply(reply);
        }
        else if (interaction) {
            interaction.reply(reply);
        }
        return false;
    }
    return true;
};
