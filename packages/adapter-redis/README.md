# @djs-commands/adapter-redis

Redis-backed `CacheAdapter` for [`@djs-commands/core`](https://www.npmjs.com/package/@djs-commands/core) cooldowns.

Distributed, TTL-native cooldown storage so sharded bots have consistent cooldowns across processes. Uses `SET key value PX <ms>` for atomic set-with-TTL — Redis stores the absolute expiry timestamp as the value AND auto-evicts the key when the TTL elapses, so you never accumulate dead entries.

📘 **Full walk-through: https://djscommands.deoxy.dev/adapter-cookbook#redis-cache-adapter-not-storage**

## Install

```bash
bun add @djs-commands/core @djs-commands/adapter-redis ioredis
```

`ioredis` and `@djs-commands/core` are peer dependencies — install them in your app.

## Usage

Pass an `ioredis` instance (URL, config, sentinel, cluster — whatever you like) into `redisCacheAdapter`, then hand the returned adapter to your command handler via the `cacheAdapter` option.

```ts
import { Client, GatewayIntentBits } from "discord.js";
import { createCommandHandler } from "@djs-commands/core";
import { redisCacheAdapter } from "@djs-commands/adapter-redis";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

createCommandHandler({
  client,
  commands: [/* ... */],
  cacheAdapter: redisCacheAdapter(redis),
});

await client.login(process.env.DISCORD_TOKEN);
```

Pair this with one of the storage adapters ([drizzle](https://www.npmjs.com/package/@djs-commands/adapter-drizzle) / [prisma](https://www.npmjs.com/package/@djs-commands/adapter-prisma) / [mongoose](https://www.npmjs.com/package/@djs-commands/adapter-mongoose)) for full persistence — `Storage` covers prefixes/locks (durable, low-traffic), `CacheAdapter` covers cooldowns (hot path, ephemeral).

## Multi-bot deployments: `keyPrefix`

When several bots share a single Redis instance, give each one a distinct prefix to avoid collisions:

```ts
const cacheAdapter = redisCacheAdapter(redis, { keyPrefix: "moderation-bot:" });
```

Every key the adapter reads or writes is prepended with this prefix. The default is `"djs-commands:"`.

## How it works

The adapter implements three methods from the `CacheAdapter` interface:

| Method   | Redis command                              |
| -------- | ------------------------------------------ |
| `set`    | `SET <prefix><key> <expiresAt> PX <ttlMs>` |
| `get`    | `GET <prefix><key>` then parse to number   |
| `delete` | `DEL <prefix><key>`                        |

`get` returns `null` for missing keys, non-numeric values, or timestamps in the past — defensive against clock skew.

## Testing

Unit tests run with a mocked `ioredis` and don't require a Redis instance.

Integration tests run against a real Redis when `REDIS_URL` is set:

```bash
REDIS_URL=redis://localhost:6379 bun test
```

If `REDIS_URL` isn't set, the integration suite skips cleanly. Spin one up locally with:

```bash
docker run --rm -p 6379:6379 redis:7-alpine
```

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE) · Issues + discussions on [GitHub](https://github.com/D3OXY/djs-commands).
