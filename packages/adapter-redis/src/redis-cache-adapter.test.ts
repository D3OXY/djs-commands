import { afterAll, describe, expect, test } from "bun:test";
import { Redis } from "ioredis";
import { redisCacheAdapter } from "./redis-cache-adapter";

// ---------------------------------------------------------------------------
// Mock-based unit tests — always run, no Redis required.
// Verify the adapter calls ioredis with the expected commands and arguments.
// ---------------------------------------------------------------------------

interface MockRedisCalls {
	get: Array<[string]>;
	set: Array<[string, string, string, number]>;
	del: Array<[string]>;
}

function createMockRedis(initial: Record<string, string> = {}) {
	const store = new Map<string, string>(Object.entries(initial));
	const calls: MockRedisCalls = { get: [], set: [], del: [] };
	const mock = {
		get: async (key: string) => {
			calls.get.push([key]);
			return store.get(key) ?? null;
		},
		set: async (key: string, value: string, mode: string, ttl: number) => {
			calls.set.push([key, value, mode, ttl]);
			store.set(key, value);
			return "OK";
		},
		del: async (key: string) => {
			calls.del.push([key]);
			const existed = store.has(key);
			store.delete(key);
			return existed ? 1 : 0;
		},
	};
	return { mock: mock as unknown as Redis, calls, store };
}

describe("redisCacheAdapter (mocked)", () => {
	test("set issues SET key value PX ttl with the default key prefix", async () => {
		const { mock, calls } = createMockRedis();
		const adapter = redisCacheAdapter(mock);
		const expiresAt = Date.now() + 5_000;
		await adapter.set("cd:test:user:1", expiresAt, 5_000);

		expect(calls.set).toHaveLength(1);
		expect(calls.set[0]).toEqual(["djs-commands:cd:test:user:1", expiresAt.toString(), "PX", 5_000]);
	});

	test("set with custom keyPrefix prepends the prefix", async () => {
		const { mock, calls } = createMockRedis();
		const adapter = redisCacheAdapter(mock, { keyPrefix: "bot-1:" });
		const expiresAt = Date.now() + 1_000;
		await adapter.set("cd:test:global", expiresAt, 1_000);

		expect(calls.set[0]?.[0]).toBe("bot-1:cd:test:global");
	});

	test("get returns the parsed expiresAt timestamp", async () => {
		const expiresAt = Date.now() + 10_000;
		const { mock } = createMockRedis({
			"djs-commands:cd:test:user:1": expiresAt.toString(),
		});
		const adapter = redisCacheAdapter(mock);

		const result = await adapter.get("cd:test:user:1");
		expect(result).toBe(expiresAt);
	});

	test("get returns null for missing keys", async () => {
		const { mock } = createMockRedis();
		const adapter = redisCacheAdapter(mock);

		const result = await adapter.get("cd:missing:user:1");
		expect(result).toBeNull();
	});

	test("get returns null when stored value is non-numeric (defensive)", async () => {
		const { mock } = createMockRedis({
			"djs-commands:cd:test:user:1": "not-a-number",
		});
		const adapter = redisCacheAdapter(mock);

		const result = await adapter.get("cd:test:user:1");
		expect(result).toBeNull();
	});

	test("get returns null when the stored expiresAt is in the past (defensive)", async () => {
		const past = Date.now() - 1_000;
		const { mock } = createMockRedis({
			"djs-commands:cd:test:user:1": past.toString(),
		});
		const adapter = redisCacheAdapter(mock);

		const result = await adapter.get("cd:test:user:1");
		expect(result).toBeNull();
	});

	test("delete issues DEL with the prefixed key", async () => {
		const { mock, calls } = createMockRedis({
			"djs-commands:cd:test:user:1": (Date.now() + 1_000).toString(),
		});
		const adapter = redisCacheAdapter(mock);
		await adapter.delete("cd:test:user:1");

		expect(calls.del).toHaveLength(1);
		expect(calls.del[0]).toEqual(["djs-commands:cd:test:user:1"]);
	});
});

// ---------------------------------------------------------------------------
// Integration tests against a real Redis. Skipped if no `REDIS_URL` env var
// is set or if a connection cannot be established within ~2 seconds.
// To run locally: `REDIS_URL=redis://localhost:6379 bun test`.
// CI without Redis will not fail — the entire suite is `describe.skip`'d.
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL;

async function tryConnect(url: string): Promise<Redis | null> {
	const client = new Redis(url, {
		lazyConnect: true,
		connectTimeout: 2_000,
		maxRetriesPerRequest: 1,
		retryStrategy: () => null,
	});
	// Swallow background errors so an unreachable host doesn't crash the test
	// process before our `.connect()` rejects.
	client.on("error", () => {});
	try {
		await client.connect();
		await client.ping();
		return client;
	} catch {
		try {
			client.disconnect();
		} catch {
			// ignore
		}
		return null;
	}
}

const liveRedis = REDIS_URL ? await tryConnect(REDIS_URL) : null;
const integration = liveRedis ? describe : describe.skip;

integration("redisCacheAdapter (integration)", () => {
	// liveRedis is non-null inside this block (describe.skip prevents callbacks
	// from running otherwise), but TypeScript can't narrow that across closures.
	const redis = liveRedis as Redis;

	afterAll(async () => {
		try {
			const keys = await redis.keys("djs-commands-test:*");
			if (keys.length > 0) await redis.del(...keys);
			const otherKeys = await redis.keys("integration-prefix:*");
			if (otherKeys.length > 0) await redis.del(...otherKeys);
		} catch {
			// ignore
		}
		redis.disconnect();
	});

	test("set then get returns the expiresAt value", async () => {
		const adapter = redisCacheAdapter(redis, { keyPrefix: "djs-commands-test:" });
		const expiresAt = Date.now() + 10_000;
		await adapter.set("cd:set-get", expiresAt, 10_000);

		const result = await adapter.get("cd:set-get");
		expect(result).toBe(expiresAt);
	});

	test("get of a missing key returns null", async () => {
		const adapter = redisCacheAdapter(redis, { keyPrefix: "djs-commands-test:" });
		const result = await adapter.get("cd:does-not-exist");
		expect(result).toBeNull();
	});

	test("set with a short TTL expires (Redis evicts the key)", async () => {
		const adapter = redisCacheAdapter(redis, { keyPrefix: "djs-commands-test:" });
		const expiresAt = Date.now() + 10;
		await adapter.set("cd:short-ttl", expiresAt, 10);
		await new Promise((r) => setTimeout(r, 60));
		const result = await adapter.get("cd:short-ttl");
		expect(result).toBeNull();
	});

	test("delete removes the key", async () => {
		const adapter = redisCacheAdapter(redis, { keyPrefix: "djs-commands-test:" });
		const expiresAt = Date.now() + 10_000;
		await adapter.set("cd:to-delete", expiresAt, 10_000);
		await adapter.delete("cd:to-delete");

		const result = await adapter.get("cd:to-delete");
		expect(result).toBeNull();
	});

	test("keyPrefix is prepended to keys (verified against raw GET)", async () => {
		const adapter = redisCacheAdapter(redis, { keyPrefix: "integration-prefix:" });
		const expiresAt = Date.now() + 10_000;
		await adapter.set("scoped-key", expiresAt, 10_000);

		const raw = await redis.get("integration-prefix:scoped-key");
		expect(raw).toBe(expiresAt.toString());
		// And nothing landed under the default prefix.
		const wrong = await redis.get("djs-commands:scoped-key");
		expect(wrong).toBeNull();
	});
});
