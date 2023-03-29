import { Client } from "discord.js";
import DJSCommands from "../../typings";

import getAllFiles from './get-all-files';

class FeaturesHandler {
    constructor(instance: DJSCommands, featureDir: string, client: Client) {
        this.readFiles(instance, featureDir, client);
    }

    private async readFiles(instance: DJSCommands, featureDir: string, client: Client) {
        const files = getAllFiles(featureDir);

        for (const file of files) {
            let func = require(file.filePath)
            func = func.default || func

            if (func instanceof Function) {
                await func(instance, client)
            }
        }
    }
}

export default FeaturesHandler;