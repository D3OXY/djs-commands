import { afterAll, describe, expect, test } from "bun:test";
import { GuildPrefixModel, runStorageConformance } from "@djs-commands/core";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { pgTable, text } from "drizzle-orm/pg-core";
import pg from "pg";
import { drizzleStorage } from "./index";

const DATABASE_URL = process.env.DATABASE_URL;

const appGuildPrefixes = pgTable("guild_prefix", {
	serverId: text("guild_id").primaryKey(),
	value: text("prefix").notNull(),
});

describe("drizzleStorage config validation", () => {
	const db = {} as NodePgDatabase;

	test("constructor validates required field mappings", () => {
		expect(() =>
			drizzleStorage(db, {
				models: {
					[GuildPrefixModel]: {
						table: appGuildPrefixes,
						fields: { guild_id: appGuildPrefixes.serverId },
					},
				},
			})
		).toThrow(/prefix/);
	});

	test("constructor validates mapping shape", () => {
		expect(() =>
			drizzleStorage(db, {
				models: {
					[GuildPrefixModel]: null as unknown as never,
				},
			})
		).toThrow(/invalid mapping/);
	});
});

async function tryConnect(url: string): Promise<{ db: NodePgDatabase; pool: pg.Pool } | null> {
	const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000, max: 1 });
	try {
		await pool.query("SELECT 1");
		return { db: drizzle(pool), pool };
	} catch {
		await pool.end().catch(() => {});
		return null;
	}
}

const live = DATABASE_URL ? await tryConnect(DATABASE_URL) : null;

if (live) {
	const { db, pool } = live;

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS guild_prefix (
			guild_id text PRIMARY KEY,
			prefix text NOT NULL
		)
	`);

	const storage = drizzleStorage(db, {
		models: {
			[GuildPrefixModel]: {
				table: appGuildPrefixes,
				fields: { guild_id: appGuildPrefixes.serverId, prefix: appGuildPrefixes.value },
			},
		},
	});

	describe("drizzleStorage (integration)", () => {
		afterAll(async () => {
			await pool.end().catch(() => {});
		});

		runStorageConformance("drizzle", async () => storage);

		test("missing mapping throws from assertModels", () => {
			const missing = drizzleStorage(db, { models: {} });
			expect(() => missing.assertModels?.([GuildPrefixModel])).toThrow(/missing mapping/);
		});
	});
} else {
	describe.skip("drizzleStorage (DATABASE_URL not set or unreachable)", () => {
		test("integration tests skipped", () => {});
	});
}
