import type { CacheAdapter } from "@djs-commands/core";
import type { Redis } from "ioredis";

const DEFAULT_KEY_PREFIX = "djs-commands:";

export interface RedisCacheAdapterOptions {
	/**
	 * Prefix prepended to every Redis key written/read by this adapter.
	 * Useful when multiple bots share a single Redis instance — give each bot
	 * a distinct prefix to avoid key collisions.
	 *
	 * Defaults to `"djs-commands:"`.
	 */
	keyPrefix?: string;
}

/**
 * Builds a {@link CacheAdapter} backed by Redis. Uses `SET ... PX <ms>` for
 * atomic set-with-TTL writes — Redis stores the absolute expiry timestamp
 * (ms) as the value AND auto-expires the key when the TTL elapses.
 *
 * @example
 * ```ts
 * import Redis from "ioredis";
 * import { redisCacheAdapter } from "@djs-commands/adapter-redis";
 * import { createCommandHandler } from "@djs-commands/core";
 *
 * const redis = new Redis(process.env.REDIS_URL!);
 * const cache = redisCacheAdapter(redis, { keyPrefix: "my-bot:" });
 *
 * createCommandHandler({ client, commands, cache });
 * ```
 */
export function redisCacheAdapter(redis: Redis, options: RedisCacheAdapterOptions = {}): CacheAdapter {
	const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
	const prefixed = (key: string): string => `${keyPrefix}${key}`;

	return {
		async get(key) {
			const raw = await redis.get(prefixed(key));
			if (raw === null) return null;
			const expiresAt = Number(raw);
			if (!Number.isFinite(expiresAt)) return null;
			// Defensive: Redis should have already evicted expired keys via PX,
			// but in the event of clock skew or race conditions, treat past
			// timestamps as missing.
			if (expiresAt <= Date.now()) return null;
			return expiresAt;
		},
		async set(key, expiresAt, ttlMs) {
			await redis.set(prefixed(key), expiresAt.toString(), "PX", ttlMs);
		},
		async delete(key) {
			await redis.del(prefixed(key));
		},
	};
}
