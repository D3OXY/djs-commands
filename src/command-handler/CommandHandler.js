const path = require('path')

const getAllFiles = require("../utils/get-all-files")
const Command = require("./Command")

class CommandHandler {
    // <CommandName, Instance of the Command class>
    commands = new Map()

    constructor(commandDir, client) {
        this.commandDir = commandDir
        this.readFiles()
        this.messageListener(client)
    }

    readFiles() {
        const files = getAllFiles(this.commandDir)

        for (const file of files) {
            const commandObject = require(file)

            let commandName = file.split(/[/\\]/)
            commandName = commandName.pop()
            commandName = commandName.split('.')[0]



            const command = new Command(commandName, commandObject)
            this.commands.set(command.commandName, command)
        }
        console.log(this.commands)
    }

    messageListener(client) {
        const validations = getAllFiles(path.join(__dirname, './validations')).map((filePath) => {
            return require(filePath)
        })
        console.log(validations)

        const prefix = '!';


        client.on('messageCreate', (message) => {
            const { content } = message
            if (!content.startsWith(prefix)) return;

            const args = content.split(/\s+/)
            const commandName = args.shift().substring(prefix.length).toLowerCase()

            const command = this.commands.get(commandName)
            if (!command) return;

            const text = args.join(' ')
            const usage = { message, args, text }

            for (const validation of validations) {
                if (!validation(command, usage, prefix)) {
                    return
                }
            }

            const { callback } = command.commandObject
            callback(usage)
        });
    }
}

module.exports = CommandHandler