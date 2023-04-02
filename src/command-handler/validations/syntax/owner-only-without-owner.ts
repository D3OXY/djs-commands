import chalk from "chalk";
import logToConsole from "../../../utils/logToConsole";
import Command from "../../Command";

export default (command: Command) => {
    const { instance, commandName, commandObject } = command;

    if (commandObject.ownerOnly !== true || instance.botOwners.length) {
        return;
    }

    logToConsole(chalk.yellow('The command "' + commandName + '" is a owner only command but no bot owners are set.'))
};