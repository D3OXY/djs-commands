import { afterAll, describe, test } from "bun:test";
import { runStorageConformance } from "@djs-commands/core";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { drizzleStorage } from "./index";

const DATABASE_URL = process.env.DATABASE_URL;

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

	const storage = drizzleStorage(db);

	describe("drizzleStorage (integration)", () => {
		afterAll(async () => {
			await pool.end().catch(() => {});
		});

		runStorageConformance("drizzle", async () => storage);
	});
} else {
	describe.skip("drizzleStorage (DATABASE_URL not set or unreachable)", () => {
		test("integration tests skipped", () => {});
	});
}
