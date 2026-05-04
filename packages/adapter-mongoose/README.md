# @djs-commands/adapter-mongoose

Mongoose/MongoDB `Storage` adapter for djs-commands. Persists framework state
(currently per-guild legacy prefix overrides; more models in slice #62).

This is the continuity path for v1 (`@d3oxy/djs-commands`) users — v1 was
Mongo-first. The adapter targets `mongoose@^8` (v1 used `mongoose@^7`); the
breaking changes between the two are documented in
[Mongoose's migrating-to-8 guide](https://mongoosejs.com/docs/migrating_to_8.html).

## Install

```bash
bun add @djs-commands/core @djs-commands/adapter-mongoose mongoose
```

`mongoose` and `@djs-commands/core` are peer dependencies — install them in
your app.

## Usage

Pass a Mongoose `Connection` (created with `mongoose.createConnection(url)`)
into `mongooseStorage`, then hand the returned `Storage` to your command
handler.

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
  storage: mongooseStorage(connection),
  legacy: { enabled: true, defaultPrefix: "!" },
  // ...
});

await client.login(process.env.DISCORD_TOKEN);
```

The adapter lazy-creates the GuildPrefix model on the connection the first
time it's needed. Mongoose caches models by name on the connection, so
re-instantiating the storage with the same connection is cheap.

## Bring-your-own-model

If you've already registered a compatible model on the connection (e.g. to
share with other code), pass it explicitly:

```ts
import { createGuildPrefixModel, mongooseStorage } from "@djs-commands/adapter-mongoose";

const guildPrefix = createGuildPrefixModel(connection);

mongooseStorage(connection, { models: { guildPrefix } });
```

`createGuildPrefixModel` is also exported as a named entry point for
Mongoose-discovery tooling:

```ts
import { createGuildPrefixModel } from "@djs-commands/adapter-mongoose/models";
```

## Local development

Spin up MongoDB for testing:

```bash
docker run --rm -p 27017:27017 mongo:7
MONGO_URL=mongodb://localhost:27017/djs-commands-test bun test
```

The integration test suite skips cleanly if `MONGO_URL` is unset or
unreachable — CI without Mongo will not fail.
