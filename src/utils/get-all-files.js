const fs = require('fs');
const p = require('path')
const getAllFiles = (path) => {
    const files = fs.readdirSync(path, {
        withFileTypes: true,
    })
    let commandFiles = []

    for (const file of files) {
        const fileName = p.join(path, file.name)

        if (file.isDirectory()) {
            commandFiles = [...commandFiles, ...getAllFiles(fileName)]
            continue
        }

        commandFiles.push(fileName)
    }

    return commandFiles;
}

module.exports = getAllFiles