import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ColorResolvable,
    EmbedBuilder,
    Message,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextChannel,
} from "discord.js";
import CommandType from "../../utils/CommandType";
import { CommandObject, CommandUsage } from "../../../typings";
import { validateHTMLColorHex } from "validate-color";
import Command from "../Command";
import CooldownTypes from "../../utils/CooldownTypes";

export default {
    name: "embed",
    description: "Sends an embed",
    type: CommandType.SLASH,
    guildOnly: true,
    permissions: [PermissionFlagsBits.Administrator],
    deferReply: "ephemeral",
    options: [
        {
            name: "channel",
            description: "The channel you want to send the embed in",
            type: ApplicationCommandOptionType.Channel,
            required: true,
        },
        {
            name: "timestamp",
            description: "Do you want to add a timestamp to the embed?",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
        {
            name: "author-image",
            description: "Do you want to add an author image to the embed?",
            type: ApplicationCommandOptionType.Attachment,
            required: false,
        },
        {
            name: "footer-image",
            description: "Do you want to add a footer image to the embed?",
            type: ApplicationCommandOptionType.Attachment,
            required: false,
        },
    ],
    autocomplete: (
        command: Command,
        argument: string,
        interaction: AutocompleteInteraction
    ) => {
        if (argument === "timestamp") {
            return ["yes", "no"];
        }
    },
    cooldowns: {
        duration: "5 m",
        type: CooldownTypes.perUser,
        errorMessage:
            "You need to wait {TIME} **OR** cancel any previous Embed Builders before creating a new one.",
    },
    callback: async ({
        interaction,
        cancelCooldown,
        instance,
        guild,
    }: CommandUsage) => {
        if (
            !guild ||
            (instance.defaultCommand.testOnly &&
                !instance.testServers.includes(guild?.id))
        )
            return "This default command is registered as test server only, and can only be ran on the test servers.";
        try {
            const channelId = interaction?.options.get("channel")?.channel?.id;
            const timestamp: boolean =
                interaction?.options.get("timestamp")?.value! === "yes"
                    ? true
                    : false;
            const authorImage: string | undefined =
                interaction?.options.get("author-image")?.attachment?.url;
            const footerImage: string | undefined =
                interaction?.options.get("author-image")?.attachment?.url;

            const row =
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("embed_builder-select")
                        .setPlaceholder("Select Options to Build the Embed")
                        .addOptions(
                            {
                                label: "Title",
                                description: "The title of the embed",
                                value: "title",
                            },
                            {
                                label: "URL",
                                description: "The URL of the embed title",
                                value: "url",
                            },
                            {
                                label: "Description",
                                description: "The description of the embed",
                                value: "description",
                            },
                            {
                                label: "Author",
                                description: "The author of the embed",
                                value: "author",
                            },
                            {
                                label: "Footer",
                                description: "The footer of the embed",
                                value: "footer",
                            },
                            {
                                label: "Thumbnail",
                                description: "The thumbnail of the embed",
                                value: "thumbnail",
                            },
                            {
                                label: "Image",
                                description: "The image of the embed",
                                value: "image",
                            },
                            {
                                label: "Color",
                                description: "The color of the embed",
                                value: "color",
                            }
                        )
                );
            const row2 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("embed_builder-send")
                        .setEmoji("✅")
                        .setLabel("Send embed")
                        .setStyle(ButtonStyle.Success)
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("embed_builder-cancel")
                        .setEmoji("❌")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Danger)
                );

            const embed = new EmbedBuilder()
                .setDescription(
                    `
                Start editing and see the changes in real time!

                **Note:** This command is still under development and may not work as expected.
                `
                )
                .setColor("#000000");

            interaction?.editReply({
                embeds: [embed],
                components: [row, row2],
            });

            //Collecting the data
            const filter = (i: any) => i.user.id === interaction?.user.id;

            const collector =
                interaction?.channel?.createMessageComponentCollector({
                    filter,
                    time: 5 * 60 * 1000, // 5 minutes
                });

            //Select menu collector
            collector?.on("collect", async (i: StringSelectMenuInteraction) => {
                if (i.customId === "embed_builder-select") {
                    await i.deferUpdate();

                    if (i.values[0] === "title") {
                        interaction?.channel
                            ?.send("What do you want the title to be?")
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        message.delete();
                                        collected.first()?.delete();
                                        const key = collected.firstKey()!;
                                        // collected.delete(key)

                                        embed.setTitle(
                                            collected.first()?.content!
                                        );
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }

                    if (i.values[0] == "url") {
                        interaction?.channel
                            ?.send("What do you want the title url to be?")
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        message.delete();
                                        collected.first()?.delete();

                                        if (
                                            !collected
                                                .first()
                                                ?.content.includes("http://") &&
                                            !collected
                                                .first()
                                                ?.content.includes("https://")
                                        ) {
                                            return interaction?.channel
                                                ?.send({
                                                    content: "Invalid url!",
                                                })
                                                .then((int) => {
                                                    setTimeout(() => {
                                                        int.delete();
                                                    }, 3000);
                                                });
                                        }

                                        embed.setURL(
                                            collected.first()?.content!
                                        );
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }

                    if (i.values[0] == "description") {
                        interaction?.channel
                            ?.send("What do you want the description to be?")
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        message.delete();
                                        collected.first()?.delete();

                                        embed.setDescription(
                                            collected.first()?.content!
                                        );
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }

                    if (i.values[0] == "author") {
                        interaction?.channel
                            ?.send("What do you want the author to be?")
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        message.delete();
                                        collected.first()?.delete();

                                        embed.setAuthor({
                                            name: collected.first()?.content!,
                                            iconURL: authorImage
                                                ? authorImage
                                                : interaction?.user.displayAvatarURL(),
                                            url: "https://deoxy.dev",
                                        });
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }

                    if (i.values[0] == "footer") {
                        interaction?.channel
                            ?.send("What do you want the footer to be?")
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        message.delete();
                                        collected.first()?.delete();

                                        embed.setFooter({
                                            text: collected.first()?.content!,
                                            iconURL: footerImage
                                                ? footerImage
                                                : interaction?.guild?.iconURL()!,
                                        });
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }

                    if (i.values[0] == "thumbnail") {
                        interaction?.channel
                            ?.send(
                                "What do you want the thumbnail to be? (URL or Upload Image Directly)"
                            )
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        let url;
                                        const msg =
                                            collected.first() as Message;

                                        if (
                                            collected
                                                .first()
                                                ?.content.includes("http://") ||
                                            collected
                                                .first()
                                                ?.content.includes("https://")
                                        ) {
                                            url = collected.first()?.content;
                                        } else if (msg.attachments) {
                                            url = msg.attachments.first()?.url;
                                        } else {
                                            return interaction?.channel
                                                ?.send({
                                                    content: "Invalid url!",
                                                })
                                                .then((int) => {
                                                    setTimeout(() => {
                                                        int.delete();
                                                    }, 3000);
                                                });
                                        }

                                        message.delete();
                                        collected.first()?.delete();

                                        embed.setThumbnail(url!);
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }

                    if (i.values[0] == "image") {
                        interaction?.channel
                            ?.send(
                                "What do you want the image to be? (URL or Upload Image Directly)"
                            )
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        let url;
                                        const msg =
                                            collected.first() as Message;

                                        if (
                                            collected
                                                .first()
                                                ?.content.includes("http://") ||
                                            collected
                                                .first()
                                                ?.content.includes("https://")
                                        ) {
                                            url = collected.first()?.content;
                                        } else if (msg.attachments) {
                                            url = msg.attachments.first()?.url;
                                        } else {
                                            return interaction?.channel
                                                ?.send({
                                                    content: "Invalid url!",
                                                })
                                                .then((int) => {
                                                    setTimeout(() => {
                                                        int.delete();
                                                    }, 3000);
                                                });
                                        }

                                        message.delete();
                                        collected.first()?.delete();

                                        embed.setImage(url!);
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }

                    if (i.values[0] == "color") {
                        interaction?.channel
                            ?.send(
                                "What do you want the color to be? (#HEX) htmlcolorcodes.com \n**If you provide anything else color will be set to default(Black).**"
                            )
                            .then(async (message) => {
                                const filterMessage = (m: Message) =>
                                    m.author.id === interaction?.user.id &&
                                    !m.author.bot;

                                interaction.channel
                                    ?.awaitMessages({
                                        filter: filterMessage,
                                        max: 1,
                                        time: 3 * 60 * 1000,
                                        errors: ["time"],
                                    })
                                    .then(async (collected) => {
                                        message.delete();
                                        collected.first()?.delete();
                                        let color: any =
                                            collected.first()?.content!;
                                        if (!color.startsWith("#")) {
                                            color = "#" + color;
                                        }
                                        color = (
                                            color && validateHTMLColorHex(color)
                                                ? color
                                                : "#000000"
                                        ) as ColorResolvable;
                                        embed.setColor(color);
                                        await interaction?.editReply({
                                            embeds: [embed],
                                        });
                                    })
                                    .catch((err) => {
                                        message.edit(
                                            "Times up! Please use the select menu again!"
                                        );
                                        setTimeout(() => {
                                            message.delete();
                                        }, 3000);
                                    });
                            });
                    }
                }
            });

            //Button collector
            collector?.on("collect", async (i: ButtonInteraction) => {
                if (i.customId === "embed_builder-send") {
                    try {
                        if (timestamp) embed.setTimestamp();
                        const channel = interaction?.guild?.channels.cache.find(
                            (c) => c.id === channelId
                        ) as TextChannel;
                        channel.send({
                            embeds: [embed],
                        });
                        collector.stop("success");
                    } catch (e) {
                        collector.stop("error");
                    }
                } else if (i.customId === "embed_builder-cancel") {
                    collector.stop("cancel");
                }
            });

            collector?.on("end", async (collected, reason) => {
                const newEmbed = new EmbedBuilder();
                row.components[0].setDisabled(true);
                row2.components[0].setDisabled(true);
                row2.components[1].setDisabled(true);

                if (reason === "time") {
                    newEmbed.setDescription(`\`\`\`Times Up!\`\`\``);
                } else if (reason === "cancel") {
                    newEmbed.setDescription(`\`\`\`Cancelled\`\`\``);
                } else if (reason === "success") {
                    newEmbed.setDescription(`\`\`\`Embed sent!\`\`\``);
                } else if (reason === "error") {
                    newEmbed.setDescription(
                        `\`\`\`Something went wrong! Please try again later\`\`\``
                    );
                } else {
                    console.log(reason);
                }
                cancelCooldown();

                interaction?.editReply({
                    content: "",
                    embeds: [newEmbed],
                    components: [row, row2],
                });
            });
        } catch (e) {
            console.log(e);
        }
    },
} as CommandObject;
