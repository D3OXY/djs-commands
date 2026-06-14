# @djs-commands/adapter-redis

## 3.0.0

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

Redis `CacheAdapter` for `@djs-commands/core` cooldowns. Distributed, TTL-native cooldown storage for sharded bots.

```ts
import { redisCacheAdapter } from "@djs-commands/adapter-redis";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

createCommandHandler({
  client,
  cacheAdapter: redisCacheAdapter(redis),
});
```

- Atomic SET-with-TTL via `SET key value PX <ms>` so the key auto-expires server-side
- Defensive `get` against missing keys, non-numeric values, and past timestamps
- `keyPrefix` option (default `"djs-commands:"`) lets multi-bot deployments share a Redis without colliding
- Peer dep `ioredis: ^5.0.0`
