# @djs-commands/adapter-drizzle

Drizzle/Postgres `Storage` adapter for [`@djs-commands/core`](https://www.npmjs.com/package/@djs-commands/core).

Persists the framework's three built-in models — **guild prefixes**, **disabled commands**, and **channel locks** — and any custom models you reach for via the generic `Storage` interface.

📘 **Full walk-through: https://djscommands.deoxy.dev/adapter-cookbook#drizzle-postgres**

## Install

```bash
bun add @djs-commands/core @djs-commands/adapter-drizzle drizzle-orm pg
bun add -d drizzle-kit
```

## Usage

1. Re-export the framework's tables from your Drizzle schema:

   ```ts
   // src/db/schema.ts
   export { channelLocks, disabledCommands, guildPrefix } from "@djs-commands/adapter-drizzle/schema";
   // ...your own tables alongside
   ```

2. Run a migration so the tables exist:

   ```bash
   bunx drizzle-kit push
   ```

3. Wire it up:

   ```ts
   import { drizzleStorage } from "@djs-commands/adapter-drizzle";
   import { drizzle } from "drizzle-orm/node-postgres";
   import { Pool } from "pg";

   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   const db = drizzle(pool);

   createCommandHandler({
     client,
     commands: [/* ... */],
     storage: drizzleStorage(db),
   });
   ```

The dispatcher reads/writes `guild_prefix`, `disabled_commands`, and `channel_locks` automatically — you don't write any code for the framework models.

## Bring-your-own-tables

Override any of the table objects (rename columns, add fields, share with your app's schema):

```ts
import { drizzleStorage } from "@djs-commands/adapter-drizzle";
import { myGuildPrefixTable } from "./schema";

drizzleStorage(db, {
  tables: { guildPrefix: myGuildPrefixTable },
});
```

## Local development

Spin up Postgres for testing:

```bash
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bun test
```

The integration test suite skips cleanly if `DATABASE_URL` is unset or unreachable — CI without Postgres will not fail.

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE) · Issues + discussions on [GitHub](https://github.com/D3OXY/djs-commands).
