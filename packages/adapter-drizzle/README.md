# @djs-commands/adapter-drizzle

Drizzle/Postgres `Storage` adapter for djs-commands. Persists framework state (currently per-guild legacy prefix overrides; more models in slice #62).

## Install

```bash
bun add @djs-commands/core @djs-commands/adapter-drizzle drizzle-orm pg
```

## Usage

1. Add the framework's schema to your Drizzle schema file:

```ts
// src/db/schema.ts
export { guildPrefix } from "@djs-commands/adapter-drizzle/schema";
// ...your own tables alongside
```

2. Run a migration so the table exists:

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
  storage: drizzleStorage(db),
  legacy: { enabled: true, defaultPrefix: "!" },
  // ...
});
```

## Bring-your-own-table

If you want a custom table name or share the table with other code, pass it explicitly:

```ts
import { GuildPrefixModel } from "@djs-commands/core";
import { drizzleStorage, guildPrefix as defaultGuildPrefix } from "@djs-commands/adapter-drizzle";

const myGuildPrefix = pgTable("my_prefix_table", { guildId: text("guild_id").primaryKey(), prefix: text("prefix").notNull() });

drizzleStorage(db, { tables: { [GuildPrefixModel]: myGuildPrefix } });
```

## Local development

Spin up Postgres for testing:

```bash
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bun test
```

The integration test suite skips cleanly if `DATABASE_URL` is unset or unreachable.
