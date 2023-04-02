import chalk from "chalk";

/**
 * Logs a message to the console warning, info or error and exit the process if needed.
 * 
 * @param {string} message - The message to log.
 * @param {boolean} [exit=false] - Whether to exit the process after logging the message.
 */
async function logToConsole(message: string, exit: boolean = false) {
    const { log } = console;
    const prefix = chalk.cyan(chalk.bold("DJSCommands >>"))

    log(`${prefix} ${message}`)
    if (exit) process.exit(1);
}

export default logToConsole;