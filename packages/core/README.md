# @djs-commands/core

Modern Discord.js command handler — TypeScript-first, Components V2 native, with pluggable persistence.

📘 **Full documentation: https://djscommands.deoxy.dev**

## Install

```bash
bun add @djs-commands/core discord.js
# or: pnpm / npm / yarn
```

`discord.js@^14.26` is a peer dependency.

## Quick start

```ts
import { Client, GatewayIntentBits } from "discord.js";
import { createCommandHandler, defineCommand } from "@djs-commands/core";

const ping = defineCommand({
	name: "ping",
	description: "Replies with pong",
	run: async ({ reply }) => {
		await reply("pong");
	},
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const handler = createCommandHandler({ client, commands: [ping] });
await handler.ready;

await client.login(process.env.DISCORD_TOKEN);
```

Prefer scaffolding? Run `npx create-djs-commands my-bot` and you're online in under a minute.

## What's in the box

- **`defineCommand`** — typed slash + legacy prefix commands with shared `CommandRunContext`. [Docs →](https://djscommands.deoxy.dev/concepts/commands)
- **Validators** — built-in `ownerOnly` / `guildOnly` / `channels` / `permissions` / `roles`, plus custom `Validator` functions. [Docs →](https://djscommands.deoxy.dev/concepts/validators)
- **Cooldowns** — four scopes (`perUser` / `perGuild` / `perUserPerGuild` / `global`); pluggable `CacheAdapter` for distributed setups. [Docs →](https://djscommands.deoxy.dev/concepts/cooldowns)
- **Plugins** — bundle commands and lifecycle hooks; `setup`/`teardown` awaited at boot. [Docs →](https://djscommands.deoxy.dev/concepts/plugins)
- **Storage** — user-owned schema for `guild_prefix`, `disabled_commands`, and `channel_locks` framework models. [Docs →](https://djscommands.deoxy.dev/concepts/storage)
- **Components V2** — function-form builders (`button`, `container`, `section`, `modal`, …); pair with [`@djs-commands/jsx`](https://www.npmjs.com/package/@djs-commands/jsx) for JSX. [Docs →](https://djscommands.deoxy.dev/components-v2)
- **fs-autoloader** — `commandDir` autoloads files; hot reloads in dev.

## Companion packages

| Package | Purpose |
|---|---|
| [`@djs-commands/jsx`](https://www.npmjs.com/package/@djs-commands/jsx) | Components V2 JSX runtime |
| [`@djs-commands/adapter-drizzle`](https://www.npmjs.com/package/@djs-commands/adapter-drizzle) | Drizzle/Postgres `Storage` |
| [`@djs-commands/adapter-prisma`](https://www.npmjs.com/package/@djs-commands/adapter-prisma) | Prisma `Storage` |
| [`@djs-commands/adapter-mongoose`](https://www.npmjs.com/package/@djs-commands/adapter-mongoose) | Mongoose `Storage` (v1 continuity path) |
| [`@djs-commands/adapter-redis`](https://www.npmjs.com/package/@djs-commands/adapter-redis) | Redis `CacheAdapter` for distributed cooldowns |
| [`create-djs-commands`](https://www.npmjs.com/package/create-djs-commands) | `npx create-djs-commands` scaffolding tool |

## Migrating from v1?

`@d3oxy/djs-commands@1.4.x` is preserved at the [`v1-final-commit` git tag](https://github.com/D3OXY/djs-commands/tree/v1-final-commit) and is no longer maintained. Every v1 API has a v3 equivalent — see the [v1 → v3 migration guide](https://djscommands.deoxy.dev/migration-from-v1).

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE) · Issues + discussions on [GitHub](https://github.com/D3OXY/djs-commands).
