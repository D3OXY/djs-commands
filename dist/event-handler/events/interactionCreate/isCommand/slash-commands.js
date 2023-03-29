"use strict";
const { InteractionType } = require('discord.js');
const handleAutoComplete = async (interaction, commands) => {
    const command = commands.get(interaction.commandName);
    if (!command)
        return;
    const { autocomplete } = command.commandObject;
    if (!autocomplete)
        return;
    const focusedOption = interaction.options.getFocused(true);
    const choices = await autocomplete(interaction, command, focusedOption.name);
    const filtered = choices.filter((choice) => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase())).slice(0, 25);
    await interaction.respond(filtered.map((choice) => ({
        name: choice,
        value: choice
    })));
};
module.exports = async (interaction, instance) => {
    const { commandHandler } = instance;
    const { commands, customCommands } = commandHandler;
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        handleAutoComplete(interaction, commands);
        return;
    }
    if (interaction.type !== InteractionType.ApplicationCommand)
        return;
    const args = interaction.options.data.map(({ value }) => {
        return String(value);
    });
    const command = commands.get(interaction.commandName);
    if (!command) {
        customCommands.run(interaction.commandName, null, interaction);
        return;
    }
    const { deferReply } = command.commandObject;
    if (deferReply)
        await interaction.deferReply({
            ephemeral: deferReply === "ephemeral"
        });
    const response = await commandHandler.runCommand(command, args, null, interaction);
    if (!response)
        return;
    if (deferReply) {
        interaction.editReply(response).catch(() => { });
    }
    else {
        interaction.reply(response).catch(() => { });
    }
};
