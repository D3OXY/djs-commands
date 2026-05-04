/**
 * Generic CRUD contract that adapters implement once and the framework
 * consumes for every persistent feature. Modeled on Better Auth's pattern —
 * adding a new model never requires changes to the adapter contract.
 *
 * `Storage.create<T>` returns the persisted row (most ORMs do this via
 * RETURNING). Adapters that don't support returning should re-fetch.
 */
export interface Storage {
	create<T extends Record<string, unknown>>(model: string, data: T): Promise<T>;
	findOne<T extends Record<string, unknown>>(model: string, where: StorageWhere): Promise<T | null>;
	findMany<T extends Record<string, unknown>>(model: string, opts?: StorageFindOpts): Promise<T[]>;
	update<T extends Record<string, unknown>>(model: string, where: StorageWhere, data: Partial<T>): Promise<T>;
	delete(model: string, where: StorageWhere): Promise<void>;
	count(model: string, where?: StorageWhere): Promise<number>;
}

export type StorageWhere = Record<string, string | number | null>;

export interface StorageFindOpts {
	where?: StorageWhere;
	limit?: number;
	offset?: number;
	orderBy?: { field: string; direction: "asc" | "desc" };
}

// ─── GuildPrefix model ─────────────────────────────────────────────────────

export const GuildPrefixModel = "guild_prefix" as const;

export interface GuildPrefixRow extends Record<string, unknown> {
	guild_id: string;
	prefix: string;
}

/** Reads a guild's persisted prefix override; null if no override is set. */
export async function getGuildPrefix(storage: Storage, guildId: string): Promise<string | null> {
	const row = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId });
	return row?.prefix ?? null;
}

/** Upserts a guild's prefix override. Pass an empty string or null to clear it. */
export async function setGuildPrefix(storage: Storage, guildId: string, prefix: string): Promise<void> {
	const existing = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId });
	if (existing) {
		await storage.update<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId }, { prefix });
	} else {
		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId, prefix });
	}
}

export async function clearGuildPrefix(storage: Storage, guildId: string): Promise<void> {
	await storage.delete(GuildPrefixModel, { guild_id: guildId });
}
