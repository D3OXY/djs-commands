import chalk from "chalk";
import logToConsole from "../../../utils/DJSLogger";
import Command from "../../Command";
import DJSLogger from "../../../utils/DJSLogger";

export default (command: Command) => {
    const { commandObject, commandName } = command;
    const { guildOnly, permissions = [] } = commandObject;

    if (guildOnly !== true && permissions.length) {
        new DJSLogger()
            .warn(chalk.yellow(`Command "${commandName}" is not a guildOnly command, but permissions are specified.`))
    }
};