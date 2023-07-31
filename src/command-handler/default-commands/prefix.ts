import { PermissionFlagsBits } from "discord.js";

import CommandType from "../../utils/CommandType";
import { CommandObject, CommandUsage } from "../../../typings";

export default {
    description: "Sets the prefix for this server",

    minArgs: 1,
    syntaxError: "Correct syntax: {PREFIX}prefix {ARGS}",
    expectedArgs: "<prefix or reset>",

    type: CommandType.BOTH,
    guildOnly: true,

    permissions: [PermissionFlagsBits.Administrator],

    callback: (commandUsage: CommandUsage) => {
        const { instance, guild, text: prefix } = commandUsage;
        if (
            !guild ||
            (instance.defaultCommand.testOnly &&
                !instance.testServers.includes(guild?.id))
        )
            return "This default command is registered as test server only, and can only be ran on the test servers.";

        if (!instance.isConnectedToDB) {
            return {
                content:
                    "This bot is not connected to a database which is required for this command. Please contact the bot owner.",
                ephemeral: true,
            };
        }

        instance.commandHandler.prefixHandler.set(guild!.id, prefix);

        if (prefix.toLowerCase() === "reset") {
            return {
                content: `Reset the command prefix for this server to \`${instance.defaultPrefix}\``,
                ephemeral: true,
            };
        }

        return {
            content: `Set "${prefix}" as the command prefix for this server.`,
            ephemeral: true,
        };
    },
} as CommandObject;
