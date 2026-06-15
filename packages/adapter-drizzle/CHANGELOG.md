# @djs-commands/adapter-drizzle

## 3.1.0

### Patch Changes

- 5ff7936: Add public API TSDoc hover docs and coverage enforcement.

## 3.0.0

### Major Changes

- d6013fc: Make storage schema user-owned. First-party adapters now require explicit framework model mappings and no longer export package-owned schemas/model factories. Core adds storage feature flags so disabled-command and channel-lock gates only query storage when enabled.

### Patch Changes

- Updated dependencies [94dac6a]
- Updated dependencies [d6013fc]
  - @djs-commands/core@3.0.0

## 2.0.1

### Patch Changes

- 50beb33: docs: refresh package READMEs

  - Drop pre-2.0 placeholder copy ("bootstrap-stage skeleton", "more models in slice #62", etc.) — every framework model ships today.
  - Link prominently to https://djscommands.deoxy.dev for concepts, recipes, and the adapter cookbook.
  - Fix `adapter-redis` README using `cache:` (handler option is `cacheAdapter`).
  - Document all three framework models (`guild_prefix`, `disabled_commands`, `channel_locks`) on every storage adapter README.
  - Add migration-guide and companion-package links throughout.

- Updated dependencies [50beb33]
  - @djs-commands/core@2.0.1

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
