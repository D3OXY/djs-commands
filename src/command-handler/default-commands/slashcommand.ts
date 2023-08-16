import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from "discord.js";
import { CommandObject, CommandUsage } from "../../../typings";
import CommandType from "../../utils/CommandType";

export default {
    type: CommandType.SLASH,
    description: "List/Delete Guild/Global Slash Commands",
    guildOnly: true,
    ownerOnly: true,
    options: [
        {
            name: "list-all",
            description: "List all slash commands",
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "delete",
            description: "List all slash commands",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "level",
                    description:
                        "The level of slash commands to delete(guild or global)",
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: "guild",
                            value: "guild",
                        },
                        {
                            name: "global",
                            value: "global",
                        },
                    ],
                    required: true,
                },
                {
                    name: "command-id",
                    description:
                        'The ID of the command to delete or "all" to delete all commands',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
    ],
    deferReply: "ephemeral",
    callback: async ({ interaction, guild, instance }: CommandUsage) => {
        if (
            !guild ||
            (instance.defaultCommand.testOnly &&
                !instance.testServers.includes(guild?.id))
        )
            return "This default command is registered as test server only, and can only be ran on the test servers.";
        try {
            if (!interaction) return "Error: Interaction not found";
            if (!guild) return "Error: Guild Only Command";
            const subCommand = (
                interaction as ChatInputCommandInteraction
            ).options.getSubcommand();

            if (subCommand === "list-all") {
                const guildCommands = await guild.commands.fetch();
                let guildCommandsList: string = "";
                if (guildCommands.size === 0) {
                    guildCommandsList = "No Guild slash commands found";
                }
                guildCommands.forEach((command) => {
                    guildCommandsList += `${command.name} - ${command.id}\n`;
                });

                const globalCommands =
                    await interaction.client.application.commands.fetch();
                let globalCommandsList: string = "";
                if (globalCommands.size === 0) {
                    globalCommandsList = "No Global slash commands found";
                }
                globalCommands.forEach((command) => {
                    globalCommandsList += `${command.name} - ${command.id}\n`;
                });

                const embed = new EmbedBuilder()
                    .setTitle("Slash Commands")
                    .setDescription("List of all slash commands")
                    .addFields(
                        {
                            name: "Guild Commands",
                            value: guildCommandsList,
                        },
                        {
                            name: "Global Commands",
                            value: globalCommandsList,
                        }
                    )
                    .setColor("#49FF33")
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [embed],
                });

                return;
            } else if (subCommand === "delete") {
                const commandToDelete = interaction.options.get(
                    "command-id",
                    true
                ).value as string;
                const level = interaction.options.get("level", true)
                    .value as string;
                if (commandToDelete === "all") {
                    return "Error: Not Implemented";
                    // if (level === "guild") {
                    //     const guildCommands = await guild.commands.fetch();
                    //     guildCommands.forEach(async (command) => {
                    //         interaction.editReply({
                    //             content: `Deleting command ${command.name} - ${command.id}`,
                    //         });
                    //         await command.delete();
                    //     });
                    //     return "Deleted all guild commands";
                    // } else if (level === "global") {
                    //     const globalCommands =
                    //         await interaction.client.application.commands.fetch();
                    //     globalCommands.forEach(async (command) => {
                    //         interaction.editReply({
                    //             content: `Deleting command ${command.name} - ${command.id}`,
                    //         });
                    //         await command.delete();
                    //     });
                    //     return "Deleted all global commands";
                    // }
                    // return;
                }
                if (level === "guild") {
                    const command = await guild.commands.fetch(commandToDelete);
                    await command.delete();
                    return `Deleted command ${command.name} - ${command.id}`;
                } else if (level === "global") {
                    const command =
                        await interaction.client.application.commands.fetch(
                            commandToDelete
                        );
                    await command.delete();
                    return `Deleted command ${command.name} - ${command.id}`;
                }
                return "Error: Bad Request";
            }

            return "Error: Bad Request";
        } catch (err: any) {
            return `Error: ${err.message}`;
        }
    },
} as CommandObject;
