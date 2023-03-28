module.exports = async (command, usage) => {
    const { commandName, instance } = command;
    const { guild, channel, message, interaction } = usage;

    if (!guild) return true;

    const availableChannels = await instance.commandHandler.channelCommands.getAvailableChannels(guild.id, commandName);

    if (availableChannels.length && !availableChannels.includes(channel.id)) {
        const reply = `The command "${commandName}" can only be used in the following channels: ${availableChannels.map((channelId) => `<#${channelId}> `)}`;

        if (message) {
            message.reply(reply);
        } else if (interaction) {
            interaction.reply(reply);
        }
        return false;
    }

    return true;
}