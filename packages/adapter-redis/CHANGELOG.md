# @djs-commands/adapter-redis

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
