# @djs-commands/adapter-mongoose

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
