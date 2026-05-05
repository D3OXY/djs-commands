# @djs-commands/adapter-drizzle

## 2.0.0

🎉 Initial v2.0.0 release.

Drizzle/Postgres `Storage` adapter. Persists per-guild legacy prefix overrides, disabled-commands kill switches, and channel locks for `@djs-commands/core`.

```ts
import { drizzleStorage } from "@djs-commands/adapter-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const db = drizzle(new pg.Pool({ connectionString: process.env.DATABASE_URL }));

createCommandHandler({
    client,
    storage: drizzleStorage(db),
    legacy: { enabled: true, defaultPrefix: "!" },
});
```

- Schema fragments for `guild_prefix`, `disabled_commands`, `channel_locks` exported from `@djs-commands/adapter-drizzle/schema`
- Bring-your-own-tables via `drizzleStorage(db, { tables })` for custom names or shared tables
- snake_case ↔ camelCase translation at the API boundary (Drizzle uses camelCase columns; the framework's API is snake_case)
- Peer dep `drizzle-orm: ^0.36.0`
