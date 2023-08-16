import chalk from "chalk";

class DJSLogger {
    constructor() {
    }


    /**
    * Logs a success message to the console.
    * 
    * @param {string} message - The message to log.
    * @param {boolean} [exit=false] - Whether to exit the process after logging the message.
    */
    async success(message: string, exit = false) {
        const { log } = console;
        const prefix = chalk.cyan(chalk.bold("DJSCommands >>"))

        log(`${prefix} ${chalk.green(message)}`)
    }

    /**
    * Logs a info message to the console.
    * 
    * @param {string} message - The message to log.
    * @param {boolean} [exit=false] - Whether to exit the process after logging the message.
    */
    async info(message: string, exit = false) {
        const { log } = console;
        const prefix = chalk.cyan(chalk.bold("DJSCommands >>"))

        log(`${prefix} ${chalk.blue(message)}`)
    }

    /**
    * Logs a warn message to the console.
    * 
    * @param {string} message - The message to log.
    * @param {boolean} [exit=false] - Whether to exit the process after logging the message.
    */
    async warn(message: string, exit = false) {
        const { log } = console;
        const prefix = chalk.cyan(chalk.bold("DJSCommands >>"))

        log(`${prefix} ${chalk.yellow(message)}`)
    }

    /**
    * Logs a error message to the console.
    * 
    * @param {string} message - The message to log.
    * @param {boolean} [exit=true] - Whether to exit the process after logging the message.
    */
    async error(message: string, exit = true) {
        const { log } = console;
        const prefix = chalk.cyan(chalk.bold("DJSCommands >>"))

        log(`${prefix} ${chalk.red(message)}`)
        if (exit) process.exit(1);
    }
}

export default DJSLogger;