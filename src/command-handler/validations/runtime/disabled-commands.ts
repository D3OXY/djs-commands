import Command from "../../Command";
import { CommandUsage } from "../../../../typings";

export default async (command: Command, usage: CommandUsage) => {
    const { commandName, instance } = command;
    const { guild, message, interaction } = usage;

    if (!guild || !instance.isConnectedToDB) {
        return true;
    }

    if (
        instance.commandHandler.disabledCommands.isDisabled(guild.id, commandName)
    ) {
        const text = "This command is disabled in this server.";

        if (message) message.channel.send(text);
        else if (interaction) {
            interaction.deferred ? interaction.editReply(text) : interaction.reply(text);
        }

        return false;
    }

    return true;
};