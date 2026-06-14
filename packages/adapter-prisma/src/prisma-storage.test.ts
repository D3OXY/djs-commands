import { afterAll, describe, expect, test } from "bun:test";
import { GuildPrefixModel, type GuildPrefixRow, runStorageConformance } from "@djs-commands/core";
import { type PrismaDelegate, prismaStorage } from "./index";

// ---------------------------------------------------------------------------
// Mock-based unit tests — always run, no Prisma client generation required.
// Verify the adapter dispatches to the correct delegate methods and maps
// snake_case API keys to camelCase Prisma fields at the boundary.
// ---------------------------------------------------------------------------

interface DelegateCall {
	method: string;
	args: unknown;
}

function createMockGuildPrefixDelegate() {
	const store = new Map<string, { guildId: string; prefix: string }>();
	const calls: DelegateCall[] = [];
	const delegate: PrismaDelegate = {
		create: async (args) => {
			calls.push({ method: "create", args });
			const data = args.data as { guildId: string; prefix: string };
			store.set(data.guildId, { ...data });
			return { ...data };
		},
		findFirst: async (args) => {
			calls.push({ method: "findFirst", args });
			const where = args.where as { guildId?: string };
			if (where.guildId) {
				return store.get(where.guildId) ?? null;
			}
			const first = store.values().next();
			return first.done ? null : first.value;
		},
		findMany: async (args) => {
			calls.push({ method: "findMany", args });
			const where = args.where as { guildId?: string } | undefined;
			const orderBy = args.orderBy as { guildId?: "asc" | "desc" } | undefined;
			let rows = Array.from(store.values());
			if (where?.guildId) rows = rows.filter((r) => r.guildId === where.guildId);
			if (orderBy?.guildId) {
				rows = [...rows].sort((a, b) => (orderBy.guildId === "asc" ? a.guildId.localeCompare(b.guildId) : b.guildId.localeCompare(a.guildId)));
			}
			if (args.skip !== undefined) rows = rows.slice(args.skip);
			if (args.take !== undefined) rows = rows.slice(0, args.take);
			return rows;
		},
		updateMany: async (args) => {
			calls.push({ method: "updateMany", args });
			const where = args.where as { guildId?: string };
			const data = args.data as Partial<{ guildId: string; prefix: string }>;
			let count = 0;
			for (const [id, row] of store) {
				if (where.guildId !== undefined && row.guildId !== where.guildId) continue;
				store.set(id, { ...row, ...data });
				count += 1;
			}
			return { count };
		},
		deleteMany: async (args) => {
			calls.push({ method: "deleteMany", args });
			const where = args.where as { guildId?: string };
			let count = 0;
			for (const [id, row] of store) {
				if (where.guildId !== undefined && row.guildId !== where.guildId) continue;
				store.delete(id);
				count += 1;
			}
			return { count };
		},
		count: async (args) => {
			calls.push({ method: "count", args });
			if (!args.where) return store.size;
			const where = args.where as { guildId?: string };
			let n = 0;
			for (const row of store.values()) {
				if (where.guildId !== undefined && row.guildId !== where.guildId) continue;
				n += 1;
			}
			return n;
		},
	};
	return { delegate, calls, store };
}

describe("prismaStorage (mocked)", () => {
	test("create maps guild_id → guildId on the way in and back on the way out", async () => {
		const { delegate, calls } = createMockGuildPrefixDelegate();
		const storage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });

		const created = await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g1", prefix: "?" });
		expect(created).toEqual({ guild_id: "g1", prefix: "?" });
		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({ method: "create", args: { data: { guildId: "g1", prefix: "?" } } });
	});

	test("findOne uses findFirst with mapped keys", async () => {
		const { delegate, store } = createMockGuildPrefixDelegate();
		store.set("g1", { guildId: "g1", prefix: "!" });
		const storage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });

		const row = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g1" });
		expect(row).toEqual({ guild_id: "g1", prefix: "!" });

		const missing = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g2" });
		expect(missing).toBeNull();
	});

	test("findMany passes through orderBy with the camelCase column", async () => {
		const { delegate, calls, store } = createMockGuildPrefixDelegate();
		store.set("a", { guildId: "a", prefix: "1" });
		store.set("b", { guildId: "b", prefix: "2" });
		const storage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });

		const rows = await storage.findMany<GuildPrefixRow>(GuildPrefixModel, {
			orderBy: { field: "guild_id", direction: "desc" },
			limit: 5,
			offset: 0,
		});
		expect(rows.map((r) => r.guild_id)).toEqual(["b", "a"]);
		const findManyCall = calls.find((c) => c.method === "findMany");
		expect(findManyCall?.args).toEqual({ orderBy: { guildId: "desc" }, take: 5, skip: 0 });
	});

	test("update uses updateMany then re-fetches; throws if no row matched", async () => {
		const { delegate, store } = createMockGuildPrefixDelegate();
		store.set("g1", { guildId: "g1", prefix: "?" });
		const storage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });

		const updated = await storage.update<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g1" }, { prefix: "!" });
		expect(updated).toEqual({ guild_id: "g1", prefix: "!" });

		await expect(storage.update<GuildPrefixRow>(GuildPrefixModel, { guild_id: "missing" }, { prefix: "$" })).rejects.toThrow(/no row matched update/);
	});

	test("update and delete reject empty where clauses", async () => {
		const { delegate, calls } = createMockGuildPrefixDelegate();
		const storage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });

		await expect(storage.update<GuildPrefixRow>(GuildPrefixModel, {}, { prefix: "!" })).rejects.toThrow(/mutating operations require at least one where condition/);
		await expect(storage.delete(GuildPrefixModel, {})).rejects.toThrow(/mutating operations require at least one where condition/);
		expect(calls.some((call) => call.method === "updateMany" || call.method === "deleteMany")).toBe(false);
	});

	test("delete uses deleteMany with mapped keys", async () => {
		const { delegate, store } = createMockGuildPrefixDelegate();
		store.set("g1", { guildId: "g1", prefix: "?" });
		const storage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });

		await storage.delete(GuildPrefixModel, { guild_id: "g1" });
		expect(store.has("g1")).toBe(false);
	});

	test("count returns the underlying delegate's count", async () => {
		const { delegate, store } = createMockGuildPrefixDelegate();
		store.set("g1", { guildId: "g1", prefix: "?" });
		store.set("g2", { guildId: "g2", prefix: "!" });
		const storage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });

		expect(await storage.count(GuildPrefixModel)).toBe(2);
		expect(await storage.count(GuildPrefixModel, { guild_id: "g1" })).toBe(1);
	});

	test("missing mapping throws loud at first use and from assertModels", async () => {
		const storage = prismaStorage({ models: {} });
		await expect(storage.findOne(GuildPrefixModel, { guild_id: "x" })).rejects.toThrow(/missing mapping/);
		expect(() => storage.assertModels?.([GuildPrefixModel])).toThrow(/missing mapping/);
	});

	test("constructor validates required field mappings", () => {
		const { delegate } = createMockGuildPrefixDelegate();
		expect(() => prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId" } } } })).toThrow(/prefix/);
	});

	test("constructor validates mapping shape", () => {
		expect(() =>
			prismaStorage({
				models: {
					[GuildPrefixModel]: null as unknown as never,
				},
			})
		).toThrow(/invalid mapping/);
	});

	test("constructor validates delegate methods", () => {
		expect(() =>
			prismaStorage({
				models: {
					[GuildPrefixModel]: {
						delegate: { create: async () => ({}) } as unknown as PrismaDelegate,
						fields: { guild_id: "guildId", prefix: "prefix" },
					},
				},
			})
		).toThrow(/Prisma delegate.*findFirst/);
	});

	test("constructor validates field mapping values", () => {
		const { delegate } = createMockGuildPrefixDelegate();
		expect(() =>
			prismaStorage({
				models: {
					[GuildPrefixModel]: {
						delegate,
						fields: { guild_id: "guildId", prefix: 1 } as unknown as Record<string, string>,
					},
				},
			})
		).toThrow(/must map to a string property name/);
	});
});

// Run the shared Storage conformance suite against an in-memory mock delegate
// so the contract is verified even without Prisma + Postgres available. The
// integration block below additionally runs it against a live Prisma client
// when DATABASE_URL is set and `@prisma/client` has been generated.
describe("prismaStorage (mocked) conformance", () => {
	const { delegate } = createMockGuildPrefixDelegate();
	const mockedStorage = prismaStorage({ models: { [GuildPrefixModel]: { delegate, fields: { guild_id: "guildId", prefix: "prefix" } } } });
	runStorageConformance("prisma-mock", async () => mockedStorage);
});

// ---------------------------------------------------------------------------
// Integration tests against a real Prisma + Postgres setup. Skipped if:
//  - `DATABASE_URL` is unset, OR
//  - `@prisma/client` hasn't been generated yet (`prisma generate`), OR
//  - Postgres isn't reachable.
//
// To run locally:
//   docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
//   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bun test
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

interface PrismaClientCtor {
	new (
		...args: unknown[]
	): {
		$connect: () => Promise<void>;
		$disconnect: () => Promise<void>;
		$executeRawUnsafe: (sql: string) => Promise<unknown>;
		[key: string]: unknown;
	};
}

async function loadAndConnect(): Promise<{ client: InstanceType<PrismaClientCtor> } | null> {
	if (!DATABASE_URL) return null;

	let PrismaClient: PrismaClientCtor;
	try {
		// Dynamic import so a missing/ungenerated client is just a skip, not a
		// load-time failure for the entire test suite.
		const mod = (await import("@prisma/client")) as { PrismaClient?: PrismaClientCtor };
		if (!mod.PrismaClient) return null;
		PrismaClient = mod.PrismaClient;
	} catch {
		return null;
	}

	let client: InstanceType<PrismaClientCtor>;
	try {
		client = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
	} catch {
		return null;
	}

	try {
		await client.$connect();
		await client.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS guild_prefix (
				guild_id text PRIMARY KEY,
				prefix text NOT NULL
			)
		`);
		return { client };
	} catch {
		try {
			await client.$disconnect();
		} catch {
			// ignore
		}
		return null;
	}
}

const live = await loadAndConnect();

if (live) {
	const { client } = live;
	const storage = prismaStorage({
		models: {
			[GuildPrefixModel]: {
				delegate: client.guildPrefix as never,
				fields: { guild_id: "guildId", prefix: "prefix" },
			},
		},
	});

	describe("prismaStorage (integration)", () => {
		afterAll(async () => {
			try {
				await client.$disconnect();
			} catch {
				// ignore
			}
		});

		runStorageConformance("prisma", async () => storage);
	});
} else {
	describe.skip("prismaStorage (DATABASE_URL unset, @prisma/client not generated, or Postgres unreachable)", () => {
		test("integration tests skipped", () => {});
	});
}
