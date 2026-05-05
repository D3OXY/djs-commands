# @djs-commands/adapter-mongoose

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

Mongoose `Storage` adapter — the v1 continuity path for bots already on MongoDB.

```ts
import { mongooseStorage } from "@djs-commands/adapter-mongoose";
import mongoose from "mongoose";

const connection = mongoose.createConnection(process.env.MONGO_URI!);

createCommandHandler({
  client,
  storage: mongooseStorage(connection),
  legacy: { enabled: true, defaultPrefix: "!" },
});
```

- Mongoose model factories: `createGuildPrefixModel`, `createDisabledCommandModel`, `createChannelLockModel` (auto-instantiated; bring-your-own via `mongooseStorage(conn, { models })`)
- Schemas use `_id: false` + `versionKey: false` so document shapes match the framework's `Record<string, unknown>` row contract
- `lean()`-based queries return plain objects (not Mongoose Documents)
- Peer dep `mongoose: ^8.0.0` (v1 was on `mongoose@7`; the breaking changes are documented in the [migration guide](https://djscommands.deoxy.dev/migration-from-v1/persistence))
