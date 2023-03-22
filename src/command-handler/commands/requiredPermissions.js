const { PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');
const requiredPermissions = require('../../models/required-permissions-schema');

const clearAllPermissions = 'Clear All Permissions';

module.exports = {
    name: 'requiredPermissions',
    description: 'Set the required permissions for a command.',
    type: 'SLASH',
    guildOnly: true,
    testOnly: true,
    // delete: true,
    permissions: [
        PermissionFlagsBits.Administrator,
    ],
    options: [
        {
            name: 'command',
            description: 'The command to set the required permissions for.',
            required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
        },
        {
            name: 'permission',
            description: 'The permission to set.',
            // required: true,
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
        }
    ],
    autocomplete: (_, command, arg) => {
        if (arg === 'command') {
            return [...command.instance.commandHandler.commands.keys()]
        } else if (arg === 'permission') {
            return [clearAllPermissions, ...Object.keys(PermissionFlagsBits)]
        }
    },

    callback: async ({ instance, guild, args }) => {
        const [commandName, permission] = args

        const command = instance.commandHandler.commands.get(commandName)

        if (!command) return `Command "${commandName}" not found.`

        const _id = guild.id + '-' + command.commandName

        if (!permission) {
            const document = await requiredPermissions.findById(_id)

            const permissions = document ? document.permissions.join(', ') : 'None.'

            return `Here are the permissions for "${commandName}": ${permissions}`
        }


        if (permission === clearAllPermissions) {
            await requiredPermissions.deleteOne({ _id })

            return `The command "${commandName}" no longer requires any permissions.`
        }


        const alreadyExists = await requiredPermissions.findOne({
            _id,
            permissions: {
                $in: [permission]
            }
        })

        if (alreadyExists) {
            //remove permission
            await requiredPermissions.findOneAndUpdate(
                {
                    _id
                },
                {
                    $pull: {
                        permissions: permission,
                    }
                }
            )

            return `The permission "${permission}" has been removed from the command "${commandName}".`
        }

        await requiredPermissions.findOneAndUpdate(
            {
                _id
            },
            {
                _id,
                $addToSet: {
                    permissions: permission
                }
            },
            {
                upsert: true,
            }
        )

        return `The permission "${permission}" has been added to the command "${commandName}".`
    }
}