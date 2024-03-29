import { CommandInteraction } from "discord.js";

import DJSCommands from "../../../../../typings";

export default async (interaction: CommandInteraction, instance: DJSCommands) => {
    const { commandHandler } = instance;
    if (!commandHandler) {
        return;
    }

    const { commands, customCommands } = commandHandler;

    const args = interaction.options.data.map(({ value }) => {
        return String(value);
    });

    const command = commands.get(interaction.commandName);
    if (!command) {
        customCommands.run(interaction.commandName, null, interaction);
        return;
    }

    const { deferReply } = command.commandObject;

    if (deferReply) {
        await interaction.deferReply({
            ephemeral: deferReply === "ephemeral",
        });
    }

    const response = await commandHandler.runCommand(
        command,
        args,
        null,
        interaction
    );
    if (!response) {
        return;
    }

    if (interaction.deferred) {
        interaction.editReply(response).catch((e) => { console.log(e) });
    } else {
        interaction.reply(response).catch((e) => { console.log(e) });
    }
};