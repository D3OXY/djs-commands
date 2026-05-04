import { GuildPrefixModel, type Storage, type StorageFindOpts, type StorageWhere } from "@djs-commands/core";
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { guildPrefix } from "./schema";

export type { GuildPrefixRow } from "./schema";
export { guildPrefix } from "./schema";

interface ModelTables {
	[GuildPrefixModel]: typeof guildPrefix;
}

interface DrizzleStorageOptions {
	tables?: Partial<ModelTables>;
}

/**
 * Returns a `Storage` implementation backed by Drizzle Postgres. Models the
 * framework knows about (currently only GuildPrefix) are mapped to their
 * Drizzle tables. Unknown models throw — adapters that don't recognize a
 * model name should fail loud, not silently no-op.
 *
 * Bring-your-own-tables: pass `options.tables` to override defaults if you've
 * customized table names or want to share a table object with other code.
 */
export function drizzleStorage(db: NodePgDatabase, options: DrizzleStorageOptions = {}): Storage {
	const tables: ModelTables = {
		[GuildPrefixModel]: options.tables?.[GuildPrefixModel] ?? guildPrefix,
	};

	const tableFor = (model: string): PgTable => {
		const table = tables[model as keyof ModelTables];
		if (!table) throw new Error(`@djs-commands/adapter-drizzle: unknown model "${model}"`);
		return table;
	};

	const buildWhere = (table: PgTable, where: StorageWhere): SQL | undefined => {
		const conditions: SQL[] = [];
		for (const [key, value] of Object.entries(where)) {
			const column = (table as unknown as Record<string, unknown>)[mapColumn(key)];
			if (!column) throw new Error(`@djs-commands/adapter-drizzle: unknown column "${key}" on table for model`);
			conditions.push(eq(column as never, value));
		}
		if (conditions.length === 0) return undefined;
		return conditions.length === 1 ? conditions[0] : and(...conditions);
	};

	return {
		async create(model, data) {
			const table = tableFor(model);
			const insertData = mapKeys(data as Record<string, unknown>);
			const [row] = await db
				.insert(table)
				.values(insertData as never)
				.returning();
			return unmapKeys(row as Record<string, unknown>) as never;
		},
		async findOne(model, where) {
			const table = tableFor(model);
			const condition = buildWhere(table, where);
			const rows = await db
				.select()
				.from(table)
				.where(condition ?? undefined)
				.limit(1);
			const row = rows[0];
			return row ? (unmapKeys(row as Record<string, unknown>) as never) : null;
		},
		async findMany(model, opts: StorageFindOpts = {}) {
			const table = tableFor(model);
			let q = db.select().from(table).$dynamic();
			if (opts.where) {
				const condition = buildWhere(table, opts.where);
				if (condition) q = q.where(condition);
			}
			if (opts.orderBy) {
				const column = (table as unknown as Record<string, unknown>)[mapColumn(opts.orderBy.field)];
				if (column) {
					q = q.orderBy(opts.orderBy.direction === "desc" ? desc(column as never) : asc(column as never));
				}
			}
			if (opts.limit !== undefined) q = q.limit(opts.limit);
			if (opts.offset !== undefined) q = q.offset(opts.offset);
			const rows = await q;
			return rows.map((r) => unmapKeys(r as Record<string, unknown>)) as never;
		},
		async update(model, where, data) {
			const table = tableFor(model);
			const condition = buildWhere(table, where);
			const updateData = mapKeys(data as Record<string, unknown>);
			const [row] = await db
				.update(table)
				.set(updateData as never)
				.where(condition ?? undefined)
				.returning();
			if (!row) throw new Error(`@djs-commands/adapter-drizzle: no row matched update for model "${model}"`);
			return unmapKeys(row as Record<string, unknown>) as never;
		},
		async delete(model, where) {
			const table = tableFor(model);
			const condition = buildWhere(table, where);
			await db.delete(table).where(condition ?? undefined);
		},
		async count(model, where) {
			const table = tableFor(model);
			const condition = where ? buildWhere(table, where) : undefined;
			const [row] = await db
				.select({ value: count() })
				.from(table)
				.where(condition ?? undefined);
			return row?.value ?? 0;
		},
	};
}

// Drizzle's TS-side column names use camelCase (guildId) while the database
// uses snake_case (guild_id). The framework's `Where`/`Row` shapes are the
// snake_case API names, so we translate at the boundary.
function mapColumn(name: string): string {
	if (name === "guild_id") return "guildId";
	return name;
}

function mapKeys(obj: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) out[mapColumn(k)] = v;
	return out;
}

function unmapKeys(obj: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		const reversed = k === "guildId" ? "guild_id" : k;
		out[reversed] = v;
	}
	return out;
}
