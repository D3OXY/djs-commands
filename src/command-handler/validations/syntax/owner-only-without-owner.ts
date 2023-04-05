import chalk from "chalk";
import logToConsole from "../../../utils/DJSLogger";
import Command from "../../Command";
import DJSLogger from "../../../utils/DJSLogger";

export default (command: Command) => {
    const { instance, commandName, commandObject } = command;

    if (commandObject.ownerOnly !== true || instance.botOwners.length) {
        return;
    }

    new DJSLogger()
        .warn(chalk.yellow('The command "' + commandName + '" is a owner only command but no bot owners are set.'))
};