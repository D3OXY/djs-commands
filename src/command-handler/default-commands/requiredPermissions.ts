import { CommandUsage } from "../../../typings";
import CommandType from "../../utils/CommandType";
import Command from "../Command";

import { PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import requiredPermissions from "../../models/required-permissions-schema";

const clearAllPermissions = "Clear All Permissions";

module.exports = {
    name: "requiredPermissions",
    description: "Set the required permissions for a command.",
    type: CommandType.SLASH,
    guildOnly: true,
    permissions: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: "command",
            description: "The command to set the required permissions for.",
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
        },
        {
            name: "permission",
            description: "The permission to set.",
            // required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
        },
    ],
    autocomplete: (command: Command, arg: string) => {
        if (arg === "command") {
            return [...command.instance.commandHandler.commands.keys()];
        } else if (arg === "permission") {
            return [clearAllPermissions, ...Object.keys(PermissionFlagsBits)];
        }
    },

    callback: async ({ instance, guild, args }: CommandUsage) => {
        if (
            !guild ||
            (instance.defaultCommand.testOnly &&
                !instance.testServers.includes(guild?.id))
        )
            return "This default command is registered as test server only, and can only be ran on the test servers.";
        const [commandName, permission] = args;

        const command = instance.commandHandler.commands.get(commandName);

        if (!command) return `Command "${commandName}" not found.`;

        const _id = guild!.id + "-" + command.commandName;

        if (!permission) {
            const document = await requiredPermissions.findById(_id);

            const permissions =
                document && document.permissions?.length
                    ? document.permissions.join(", ")
                    : "None.";

            return `Here are the permissions for "${commandName}": ${permissions}`;
        }

        if (permission === clearAllPermissions) {
            await requiredPermissions.deleteOne({ _id });

            return `The command "${commandName}" no longer requires any permissions.`;
        }

        const alreadyExists = await requiredPermissions.findOne({
            _id,
            permissions: {
                $in: [permission],
            },
        });

        if (alreadyExists) {
            //remove permission
            await requiredPermissions.findOneAndUpdate(
                {
                    _id,
                },
                {
                    $pull: {
                        permissions: permission,
                    },
                }
            );

            return {
                content: `The permission "${permission}" has been removed from the command "${commandName}".`,
                ephemeral: true,
            };
        }

        await requiredPermissions.findOneAndUpdate(
            {
                _id,
            },
            {
                _id,
                $addToSet: {
                    permissions: permission,
                },
            },
            {
                upsert: true,
            }
        );

        return {
            content: `The permission "${permission}" has been added to the command "${commandName}".`,
            ephemeral: true,
        };
    },
};
