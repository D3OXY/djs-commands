import { afterAll, describe, expect, test } from "bun:test";
import { GuildPrefixModel, type GuildPrefixRow, runStorageConformance } from "@djs-commands/core";
import { GUILD_PREFIX_PRISMA_MODEL, prismaStorage } from "./index";

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
	const delegate = {
		create: async (args: { data: { guildId: string; prefix: string } }) => {
			calls.push({ method: "create", args });
			store.set(args.data.guildId, { ...args.data });
			return { ...args.data };
		},
		findFirst: async (args: { where: { guildId?: string } }) => {
			calls.push({ method: "findFirst", args });
			if (args.where.guildId) {
				return store.get(args.where.guildId) ?? null;
			}
			const first = store.values().next();
			return first.done ? null : first.value;
		},
		findMany: async (args: { where?: { guildId?: string }; orderBy?: { guildId?: "asc" | "desc" }; take?: number; skip?: number }) => {
			calls.push({ method: "findMany", args });
			let rows = Array.from(store.values());
			if (args.where?.guildId) rows = rows.filter((r) => r.guildId === args.where?.guildId);
			if (args.orderBy?.guildId) {
				rows = [...rows].sort((a, b) => (args.orderBy?.guildId === "asc" ? a.guildId.localeCompare(b.guildId) : b.guildId.localeCompare(a.guildId)));
			}
			if (args.skip !== undefined) rows = rows.slice(args.skip);
			if (args.take !== undefined) rows = rows.slice(0, args.take);
			return rows;
		},
		updateMany: async (args: { where: { guildId?: string }; data: Partial<{ guildId: string; prefix: string }> }) => {
			calls.push({ method: "updateMany", args });
			let count = 0;
			for (const [id, row] of store) {
				if (args.where.guildId !== undefined && row.guildId !== args.where.guildId) continue;
				store.set(id, { ...row, ...args.data });
				count += 1;
			}
			return { count };
		},
		deleteMany: async (args: { where: { guildId?: string } }) => {
			calls.push({ method: "deleteMany", args });
			let count = 0;
			for (const [id, row] of store) {
				if (args.where.guildId !== undefined && row.guildId !== args.where.guildId) continue;
				store.delete(id);
				count += 1;
			}
			return { count };
		},
		count: async (args: { where?: { guildId?: string } }) => {
			calls.push({ method: "count", args });
			if (!args.where) return store.size;
			let n = 0;
			for (const row of store.values()) {
				if (args.where.guildId !== undefined && row.guildId !== args.where.guildId) continue;
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
		const storage = prismaStorage({ guildPrefix: delegate });

		const created = await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g1", prefix: "?" });
		expect(created).toEqual({ guild_id: "g1", prefix: "?" });
		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({ method: "create", args: { data: { guildId: "g1", prefix: "?" } } });
	});

	test("findOne uses findFirst with mapped keys", async () => {
		const { delegate, store } = createMockGuildPrefixDelegate();
		store.set("g1", { guildId: "g1", prefix: "!" });
		const storage = prismaStorage({ guildPrefix: delegate });

		const row = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g1" });
		expect(row).toEqual({ guild_id: "g1", prefix: "!" });

		const missing = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g2" });
		expect(missing).toBeNull();
	});

	test("findMany passes through orderBy with the camelCase column", async () => {
		const { delegate, calls, store } = createMockGuildPrefixDelegate();
		store.set("a", { guildId: "a", prefix: "1" });
		store.set("b", { guildId: "b", prefix: "2" });
		const storage = prismaStorage({ guildPrefix: delegate });

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
		const storage = prismaStorage({ guildPrefix: delegate });

		const updated = await storage.update<GuildPrefixRow>(GuildPrefixModel, { guild_id: "g1" }, { prefix: "!" });
		expect(updated).toEqual({ guild_id: "g1", prefix: "!" });

		await expect(storage.update<GuildPrefixRow>(GuildPrefixModel, { guild_id: "missing" }, { prefix: "$" })).rejects.toThrow(/no row matched update/);
	});

	test("delete uses deleteMany with mapped keys", async () => {
		const { delegate, store } = createMockGuildPrefixDelegate();
		store.set("g1", { guildId: "g1", prefix: "?" });
		const storage = prismaStorage({ guildPrefix: delegate });

		await storage.delete(GuildPrefixModel, { guild_id: "g1" });
		expect(store.has("g1")).toBe(false);
	});

	test("count returns the underlying delegate's count", async () => {
		const { delegate, store } = createMockGuildPrefixDelegate();
		store.set("g1", { guildId: "g1", prefix: "?" });
		store.set("g2", { guildId: "g2", prefix: "!" });
		const storage = prismaStorage({ guildPrefix: delegate });

		expect(await storage.count(GuildPrefixModel)).toBe(2);
		expect(await storage.count(GuildPrefixModel, { guild_id: "g1" })).toBe(1);
	});

	test("unknown delegate on the client throws loud", () => {
		expect(() => prismaStorage({})).toThrow(/no delegate for model "guild_prefix"/);
	});

	test("GUILD_PREFIX_PRISMA_MODEL exports the schema fragment string", () => {
		expect(GUILD_PREFIX_PRISMA_MODEL).toContain("model GuildPrefix");
		expect(GUILD_PREFIX_PRISMA_MODEL).toContain('@map("guild_id")');
		expect(GUILD_PREFIX_PRISMA_MODEL).toContain('@@map("guild_prefix")');
	});
});

// Run the shared Storage conformance suite against an in-memory mock delegate
// so the contract is verified even without Prisma + Postgres available. The
// integration block below additionally runs it against a live Prisma client
// when DATABASE_URL is set and `@prisma/client` has been generated.
describe("prismaStorage (mocked) conformance", () => {
	const { delegate } = createMockGuildPrefixDelegate();
	const mockedStorage = prismaStorage({ guildPrefix: delegate });
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
	const storage = prismaStorage(client);

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
