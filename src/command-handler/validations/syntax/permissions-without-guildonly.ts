import chalk from "chalk";
import logToConsole from "../../../utils/logToConsole";
import Command from "../../Command";

export default (command: Command) => {
    const { commandObject, commandName } = command;
    const { guildOnly, permissions = [] } = commandObject;

    if (guildOnly !== true && permissions.length) {
        logToConsole(chalk.yellow(`Command "${commandName}" is not a guildOnly command, but permissions are specified.`))
    }
};