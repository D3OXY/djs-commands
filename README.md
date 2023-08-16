<a  href='https://discord.com/invite/Stc5W333bq'  target='_blank'>![alt Discord](https://img.shields.io/discord/756751516169142323?color=7289da&logo=discord&logoColor=white)</a> <a  href='https://github.com/D3OXY/'  target='_blank'>![alt GitHub Repo](https://img.shields.io/github/stars/D3OXY/djs-commands?style=social)</a>

<a  href='https://nodei.co/npm/@d3oxy/djs-commands/'  target='_blank'>![alt DJSCommands](https://nodei.co/npm/@d3oxy/djs-commands.png)</a>

# DJSCommands

DJS-Commands is a lightweight, easy-to-use command handling library for Discord.js bots. It's designed to make it easy for developers to add custom commands to their bots without having to write all the boilerplate code themselves.

## Features

-   Simple command creation and management
-   Supports Legacy commands and Slash commands
-   Well written, easy to follow [documentation](https://djscommands.deoxy.dev)
-   Custom command validations
-   Command aliases
-   Dynamic argument validation
-   Easy integration with existing Discord.js bots
-   Lightweight and fast
-   Event Handler
-   Feature handler

# Installation

You can install DJS-Commands via npm:

```bash

npm install  @d3oxy/djs-commands

```

# Usage

You can find the full documentation [here](https://djscommands.deoxy.dev).
Here's a basic example of how to use DJS-Commands in your bot:

### Javascript

```js
const { Client, IntentsBitField, Partials } = require("discord.js");
const path = require("path");
const CommandHandler = require("@d3oxy/djs-commands");

require("dotenv").config();

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
    ],
    partials: [Partials.Channel],
});

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    new CommandHandler({
        client, // Required
        mongoUri: process.env.MONGO_URI, // Optional
        commandDir: path.join(__dirname, "commands"),
        featuresDir: path.join(__dirname, "features"),
        defaultPrefix: "!", // Default
        events: {
            dir: path.join(__dirname, "events"),
        },
    });
});
client.login("YOUR_BOT_TOKEN");
```

### Typescript

```js
import { Client, IntentsBitField, Partials } from "discord.js";
import path from "path";
import CommandHandler from "@d3oxy/djs-commands";
require("dotenv").config();

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
    ],
    partials: [Partials.Channel],
});

client.on("ready", () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    new CommandHandler({
        client, // Required
        mongoUri: process.env.MONGO_URI, // Optional
        commandDir: path.join(__dirname, "commands"),
        featuresDir: path.join(__dirname, "features"),
        defaultPrefix: "!", // Default
        events: {
            dir: path.join(__dirname, "events"),
        },
    });
});
client.login("YOUR_BOT_TOKEN");
```

# Documentation

You can find the full documentation [here](https://djscommands.deoxy.dev).

-   [Home Page](https://djscommands.deoxy.dev)
-   [Installation](https://djscommands.deoxy.dev/getting-started/installation)
-   [Getting Started](https://djscommands.deoxy.dev/getting-started)
-   [Project Setup - Typescript](https://djscommands.deoxy.dev/getting-started/project-setup-typescript)
-   [Project Setup - Javascript](https://djscommands.deoxy.dev/getting-started/project-setup-javascript)

# Contributing

Contributions are welcome! If you find a bug or have a feature request, please create an issue on the [GitHub repository](https://github.com/D3oxy/djs-commands/issues). If you'd like to contribute code, please fork the repository and submit a pull request.

## License

DJSCommands is released under the [MIT License](https://github.com/D3oxy/djs-commands/blob/main/LICENSE).

---
