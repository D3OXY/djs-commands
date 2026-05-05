# @djs-commands/adapter-mongoose

Mongoose/MongoDB `Storage` adapter for [`@djs-commands/core`](https://www.npmjs.com/package/@djs-commands/core).

Persists the framework's three built-in models — **guild prefixes**, **disabled commands**, and **channel locks**. This is the v1 (`@d3oxy/djs-commands`) continuity path — v1 was Mongo-first.

📘 **Full walk-through: https://djscommands.deoxy.dev/adapter-cookbook#mongoose-mongodb**

The adapter targets `mongoose@^8`. v1 was on `mongoose@^7`; the breaking changes between the two are documented in [Mongoose's migrating-to-8 guide](https://mongoosejs.com/docs/migrating_to_8.html).

## Install

```bash
bun add @djs-commands/core @djs-commands/adapter-mongoose mongoose
```

`mongoose` and `@djs-commands/core` are peer dependencies — install them in your app.

## Usage

Pass a Mongoose `Connection` (created with `mongoose.createConnection(url)`) into `mongooseStorage`, then hand the returned `Storage` to your command handler.

```ts
import { Client, GatewayIntentBits } from "discord.js";
import { createCommandHandler } from "@djs-commands/core";
import { mongooseStorage } from "@djs-commands/adapter-mongoose";
import mongoose from "mongoose";

const connection = mongoose.createConnection(process.env.MONGO_URL!);
await connection.asPromise();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

createCommandHandler({
  client,
  commands: [/* ... */],
  storage: mongooseStorage(connection),
});

await client.login(process.env.DISCORD_TOKEN);
```

The adapter lazy-creates the framework models on the connection the first time each is needed. Mongoose caches models by name on the connection, so re-instantiating the storage with the same connection is cheap.

## Bring-your-own-models

If you've already registered compatible models on the connection (e.g. to share with other code), pass them explicitly:

```ts
import {
  createGuildPrefixModel,
  createDisabledCommandModel,
  createChannelLockModel,
  mongooseStorage,
} from "@djs-commands/adapter-mongoose";

mongooseStorage(connection, {
  models: {
    guildPrefix: createGuildPrefixModel(connection),
    disabledCommand: createDisabledCommandModel(connection),
    channelLock: createChannelLockModel(connection),
  },
});
```

## Coming from v1?

`@d3oxy/djs-commands@1.4.x` is preserved at the [`v1-final-commit` git tag](https://github.com/D3OXY/djs-commands/tree/v1-final-commit) and is no longer maintained. Your existing Mongoose connection works as-is — see the [v1 → v2 migration guide](https://djscommands.deoxy.dev/migration-from-v1) for the rest.

## Local development

Spin up MongoDB for testing:

```bash
docker run --rm -p 27017:27017 mongo:7
MONGO_URL=mongodb://localhost:27017/djs-commands-test bun test
```

The integration test suite skips cleanly if `MONGO_URL` is unset or unreachable — CI without Mongo will not fail.

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE) · Issues + discussions on [GitHub](https://github.com/D3OXY/djs-commands).
