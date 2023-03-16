const path = require('path')

const getAllFiles = require("../utils/get-all-files")
const Command = require("./Command")

class CommandHandler {
    // <CommandName, Instance of the Command class>
    commands = new Map()

    constructor(instance, commandDir, client) {
        this._instance = instance
        this._commandDir = commandDir
        this.readFiles()
        this.messageListener(client)
    }

    readFiles() {
        const files = getAllFiles(this._commandDir)
        const validations = this.getValidations('syntax')

        for (const file of files) {
            const commandObject = require(file)

            let commandName = file.split(/[/\\]/)
            commandName = commandName.pop()
            commandName = commandName.split('.')[0]

            const command = new Command(this._instance, commandName, commandObject)

            for (const validation of validations) {
                validation(command)
            }
            this.commands.set(command.commandName, command)
        }
        // console.log(this.commands)
    }

    messageListener(client) {
        const validations = this.getValidations('run-time')
        const prefix = '!';

        client.on('messageCreate', (message) => {
            const { content } = message
            if (!content.startsWith(prefix)) return;

            const args = content.split(/\s+/)
            const commandName = args.shift().substring(prefix.length).toLowerCase()

            const command = this.commands.get(commandName)
            if (!command) return;

            const usage = { message, args, text: args.join(' '), guild: message.guild }

            for (const validation of validations) {
                if (!validation(command, usage, prefix)) {
                    return
                }
            }

            const { callback } = command.commandObject
            callback(usage)
        });
    }

    getValidations(folder) {
        const validations = getAllFiles(path.join(__dirname, `./validations/${folder}`)).map((filePath) => {
            return require(filePath)
        })

        return validations;
    }
}

module.exports = CommandHandler