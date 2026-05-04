# @djs-commands/core

Command dispatcher and core API for djs-commands v2.

> Bootstrap-stage skeleton. Public API is unstable until 2.0.0.

## Install

```bash
bun add @djs-commands/core discord.js
```

## Usage

```ts
import { Client, GatewayIntentBits } from "discord.js";
import { createCommandHandler, defineCommand } from "@djs-commands/core";

const ping = defineCommand({
	name: "ping",
	description: "Replies with pong",
	run: async ({ interaction }) => {
		await interaction.reply("pong");
	},
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

createCommandHandler({ client, commands: [ping] });

await client.login(process.env.DISCORD_TOKEN);
```

## Roadmap

This package is being built out incrementally. See the [v2 PRD](https://github.com/D3OXY/djs-commands/issues/51).
