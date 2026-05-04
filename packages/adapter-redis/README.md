# @djs-commands/adapter-redis

Redis-backed [`CacheAdapter`](https://github.com/D3OXY/djs-commands) for
[`@djs-commands/core`](https://github.com/D3OXY/djs-commands) cooldowns.

> Distributed, TTL-native cooldown storage so sharded bots have consistent
> cooldowns across processes. Uses `SET ... PX <ms>` for atomic
> set-with-TTL — Redis stores the absolute expiry timestamp as the value
> AND auto-evicts the key when the TTL elapses.

## Install

```bash
bun add @djs-commands/adapter-redis @djs-commands/core ioredis
```

`ioredis` and `@djs-commands/core` are peer dependencies — install them in
your app.

## Usage

Pass an `ioredis` instance (constructed however you like — connection URL,
config object, sentinel, cluster) into `redisCacheAdapter`, then hand the
returned adapter to your command handler.

```ts
import { Client, GatewayIntentBits } from "discord.js";
import { createCommandHandler } from "@djs-commands/core";
import { redisCacheAdapter } from "@djs-commands/adapter-redis";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);
const cache = redisCacheAdapter(redis);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

createCommandHandler({ client, commands: [/* ... */], cache });

await client.login(process.env.DISCORD_TOKEN);
```

### Multi-bot deployments: `keyPrefix`

When several bots share a single Redis instance, give each one a distinct
prefix to avoid collisions:

```ts
const cache = redisCacheAdapter(redis, { keyPrefix: "moderation-bot:" });
```

Every key the adapter reads or writes is prepended with this prefix. The
default is `"djs-commands:"`.

## How it works

The adapter implements three methods from the `CacheAdapter` interface:

| Method   | Redis command                              |
| -------- | ------------------------------------------ |
| `set`    | `SET <prefix><key> <expiresAt> PX <ttlMs>` |
| `get`    | `GET <prefix><key>` then parse to number   |
| `delete` | `DEL <prefix><key>`                        |

`get` returns `null` for missing keys, non-numeric values, or timestamps in
the past — defensive against clock skew.

## Testing

Unit tests run with a mocked `ioredis` and don't require a Redis instance.

Integration tests run against a real Redis when `REDIS_URL` is set:

```bash
REDIS_URL=redis://localhost:6379 bun test
```

If `REDIS_URL` isn't set, the integration suite skips cleanly — CI without
Redis will not fail. Locally you can spin one up with:

```bash
docker run --rm -p 6379:6379 redis:7-alpine
```
