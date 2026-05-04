import { expect, test } from "bun:test";
import { GuildPrefixModel, type GuildPrefixRow, type Storage } from "./storage";

/**
 * Shared test suite that any `Storage` adapter implementation can run against
 * to verify it satisfies the generic CRUD contract. Adapters call this from
 * their own `*.test.ts` once they've spun up a backend (Postgres, Mongo, …)
 * and acquired a Storage instance.
 *
 * The suite uses the GuildPrefix model since it ships with core. Adapters
 * are expected to clean their state between runs themselves; this suite
 * delete-cleans every row it touches.
 */
export function runStorageConformance(name: string, factory: () => Promise<Storage>): void {
	test(`${name}: create + findOne round-trip`, async () => {
		const storage = await factory();
		await storage.delete(GuildPrefixModel, { guild_id: "conf-1" });

		const created = await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-1", prefix: "?" });
		expect(created.guild_id).toBe("conf-1");
		expect(created.prefix).toBe("?");

		const found = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-1" });
		expect(found?.prefix).toBe("?");

		await storage.delete(GuildPrefixModel, { guild_id: "conf-1" });
	});

	test(`${name}: findOne returns null for missing rows`, async () => {
		const storage = await factory();
		const found = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "does-not-exist" });
		expect(found).toBeNull();
	});

	test(`${name}: update modifies fields`, async () => {
		const storage = await factory();
		await storage.delete(GuildPrefixModel, { guild_id: "conf-2" });
		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-2", prefix: "?" });

		const updated = await storage.update<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-2" }, { prefix: "!" });
		expect(updated.prefix).toBe("!");

		const found = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-2" });
		expect(found?.prefix).toBe("!");

		await storage.delete(GuildPrefixModel, { guild_id: "conf-2" });
	});

	test(`${name}: delete removes the row`, async () => {
		const storage = await factory();
		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-3", prefix: "?" });
		await storage.delete(GuildPrefixModel, { guild_id: "conf-3" });

		const found = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-3" });
		expect(found).toBeNull();
	});

	test(`${name}: findMany returns multiple rows in declared order`, async () => {
		const storage = await factory();
		for (const id of ["a", "b", "c"]) {
			await storage.delete(GuildPrefixModel, { guild_id: `conf-many-${id}` });
		}
		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-many-a", prefix: "1" });
		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-many-b", prefix: "2" });
		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-many-c", prefix: "3" });

		const rows = await storage.findMany<GuildPrefixRow>(GuildPrefixModel, {
			orderBy: { field: "guild_id", direction: "asc" },
		});
		const matched = rows.filter((r) => r.guild_id.startsWith("conf-many-"));
		expect(matched.map((r) => r.guild_id)).toEqual(["conf-many-a", "conf-many-b", "conf-many-c"]);

		for (const id of ["a", "b", "c"]) {
			await storage.delete(GuildPrefixModel, { guild_id: `conf-many-${id}` });
		}
	});

	test(`${name}: count returns the expected number`, async () => {
		const storage = await factory();
		await storage.delete(GuildPrefixModel, { guild_id: "conf-count" });

		const before = await storage.count(GuildPrefixModel, { guild_id: "conf-count" });
		expect(before).toBe(0);

		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: "conf-count", prefix: "?" });

		const after = await storage.count(GuildPrefixModel, { guild_id: "conf-count" });
		expect(after).toBe(1);

		await storage.delete(GuildPrefixModel, { guild_id: "conf-count" });
	});
}
