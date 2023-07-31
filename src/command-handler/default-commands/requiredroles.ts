import { CommandUsage } from "../../../typings";
import CommandType from "../../utils/CommandType";
import Command from "../Command";

import { PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import requiredroles from "../../models/required-roles-schema";

module.exports = {
    name: "requiredroles",
    description: "Set the required roles for a command.",
    type: CommandType.SLASH,
    guildOnly: true,
    // delete: true,
    roles: [PermissionFlagsBits.Administrator],
    options: [
        {
            name: "command",
            description: "The command to set the required roles for.",
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
        },
        {
            name: "role",
            description: "The role to set.",
            // required: true,
            type: ApplicationCommandOptionType.Role,
        },
    ],
    autocomplete: (command: Command) => {
        return [...command.instance.commandHandler.commands.keys()];
    },

    callback: async ({ instance, guild, args }: CommandUsage) => {
        const [commandName, role] = args;

        const command = instance.commandHandler.commands.get(commandName);

        if (!command) return `Command "${commandName}" not found.`;

        const _id = guild!.id + "-" + command.commandName;

        if (!role) {
            const document = await requiredroles.findById(_id);

            const roles =
                document && document.roles?.length
                    ? document.roles.map((roleId: string) => `<@&${roleId}>`)
                    : "None.";

            return {
                content: `The required roles for the command "${commandName}" are: ${roles}`,
                allowedMentions: {
                    roles: {},
                },
            };
        }

        const alreadyExists = await requiredroles.findOne({
            _id,
            roles: {
                $in: [role],
            },
        });

        if (alreadyExists) {
            //remove role
            await requiredroles.findOneAndUpdate(
                {
                    _id,
                },
                {
                    $pull: {
                        roles: role,
                    },
                }
            );

            return {
                content: `The role <@&${role}> has been removed from the command "${commandName}".`,
                allowedMentions: {
                    roles: {},
                },
                ephemeral: true,
            };
        }

        await requiredroles.findOneAndUpdate(
            {
                _id,
            },
            {
                _id,
                $addToSet: {
                    roles: role,
                },
            },
            {
                upsert: true,
            }
        );

        return {
            content: `The role <@&${role}> has been added to the command "${commandName}".`,
            allowedMentions: {
                roles: {},
            },
            ephemeral: true,
        };
    },
};
