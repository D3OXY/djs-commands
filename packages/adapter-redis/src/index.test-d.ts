import type { CacheAdapter } from "@djs-commands/core";
import { expectTypeOf } from "expect-type";
import type { Redis } from "ioredis";
import { type RedisCacheAdapterOptions, redisCacheAdapter } from "./redis-cache-adapter";

// The factory must return a CacheAdapter exactly.
declare const redis: Redis;
expectTypeOf(redisCacheAdapter(redis)).toEqualTypeOf<CacheAdapter>();
expectTypeOf(redisCacheAdapter(redis, { keyPrefix: "x:" })).toEqualTypeOf<CacheAdapter>();

// Options shape.
expectTypeOf<RedisCacheAdapterOptions>().toEqualTypeOf<{ keyPrefix?: string }>();

// Method signatures.
const adapter = redisCacheAdapter(redis);
expectTypeOf(adapter.get).parameter(0).toEqualTypeOf<string>();
expectTypeOf(adapter.get).returns.toEqualTypeOf<Promise<number | null>>();
expectTypeOf(adapter.set).parameters.toEqualTypeOf<[key: string, expiresAt: number, ttlMs: number]>();
expectTypeOf(adapter.set).returns.toEqualTypeOf<Promise<void>>();
expectTypeOf(adapter.delete).parameter(0).toEqualTypeOf<string>();
expectTypeOf(adapter.delete).returns.toEqualTypeOf<Promise<void>>();
