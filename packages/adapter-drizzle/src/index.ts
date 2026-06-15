import { assertRequiredStorageFields, type FrameworkStorageModel, type Storage, type StorageFindOpts, type StorageWhere } from "@djs-commands/core";
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";

type DrizzleColumn = unknown;

/** Mapping from one djs-commands framework model to an app-owned Drizzle table. */
export interface DrizzleModelMapping {
	/** App-owned table. DJS Commands never creates tables or migrations. */
	table: PgTable;
	/** Logical framework fields mapped to Drizzle columns from `table`. */
	fields: Record<string, DrizzleColumn>;
}

/** Options for `drizzleStorage`. Map only models required by enabled storage features. */
export interface DrizzleStorageOptions {
	/** Framework model mappings keyed by `GuildPrefixModel`, `DisabledCommandsModel`, or `ChannelLocksModel`. */
	models: Partial<Record<FrameworkStorageModel, DrizzleModelMapping>>;
}

interface ResolvedModel {
	table: PgTable;
	fields: Record<string, DrizzleColumn>;
	properties: Record<string, string>;
}

/**
 * Creates a Storage adapter backed by Drizzle.
 *
 * @remarks
 * Your app owns schema, table names, indexes, migrations, and connection lifecycle.
 * This adapter only translates djs-commands logical fields to your mapped columns.
 *
 * @example
 * ```ts
 * drizzleStorage(db, {
 *   models: {
 *     [GuildPrefixModel]: {
 *       table: guildPrefixes,
 *       fields: { guild_id: guildPrefixes.guildId, prefix: guildPrefixes.prefix },
 *     },
 *   },
 * });
 * ```
 */
export function drizzleStorage(db: NodePgDatabase, options: DrizzleStorageOptions): Storage {
	const models = resolveModels(options);

	const modelFor = (model: string): ResolvedModel => {
		const mapped = models[model as FrameworkStorageModel];
		if (!mapped) throw new Error(`@djs-commands/adapter-drizzle: missing mapping for model "${model}"`);
		return mapped;
	};

	const buildWhere = (mapped: ResolvedModel, where: StorageWhere, opts: { allowEmpty: boolean }): SQL | undefined => {
		const conditions: SQL[] = [];
		for (const [field, value] of Object.entries(where)) {
			const column = mapped.fields[field];
			if (!column) throw new Error(`@djs-commands/adapter-drizzle: unknown mapped field "${field}"`);
			conditions.push(eq(column as never, value));
		}
		if (conditions.length === 0) {
			if (opts.allowEmpty) return undefined;
			throw new Error("@djs-commands/adapter-drizzle: mutating operations require at least one where condition");
		}
		return conditions.length === 1 ? conditions[0] : and(...conditions);
	};

	const toDb = (mapped: ResolvedModel, data: Record<string, unknown>): Record<string, unknown> => {
		const out: Record<string, unknown> = {};
		for (const [field, value] of Object.entries(data)) {
			const property = mapped.properties[field];
			if (!property) throw new Error(`@djs-commands/adapter-drizzle: unknown mapped field "${field}"`);
			out[property] = value;
		}
		return out;
	};

	const fromDb = (mapped: ResolvedModel, row: Record<string, unknown>): Record<string, unknown> => {
		const out: Record<string, unknown> = {};
		for (const [field, property] of Object.entries(mapped.properties)) out[field] = row[property];
		return out;
	};

	return {
		assertModels(required) {
			for (const model of required) modelFor(model);
		},
		async create(model, data) {
			const mapped = modelFor(model);
			const [row] = await db
				.insert(mapped.table)
				.values(toDb(mapped, data as Record<string, unknown>) as never)
				.returning();
			return fromDb(mapped, row as Record<string, unknown>) as never;
		},
		async findOne(model, where) {
			const mapped = modelFor(model);
			const condition = buildWhere(mapped, where, { allowEmpty: true });
			const rows = await db
				.select()
				.from(mapped.table)
				.where(condition ?? undefined)
				.limit(1);
			const row = rows[0];
			return row ? (fromDb(mapped, row as Record<string, unknown>) as never) : null;
		},
		async findMany(model, opts: StorageFindOpts = {}) {
			const mapped = modelFor(model);
			let q = db.select().from(mapped.table).$dynamic();
			if (opts.where) {
				const condition = buildWhere(mapped, opts.where, { allowEmpty: true });
				if (condition) q = q.where(condition);
			}
			if (opts.orderBy) {
				const column = mapped.fields[opts.orderBy.field];
				if (!column) throw new Error(`@djs-commands/adapter-drizzle: unknown mapped field "${opts.orderBy.field}"`);
				q = q.orderBy(opts.orderBy.direction === "desc" ? desc(column as never) : asc(column as never));
			}
			if (opts.limit !== undefined) q = q.limit(opts.limit);
			if (opts.offset !== undefined) q = q.offset(opts.offset);
			const rows = await q;
			return rows.map((row) => fromDb(mapped, row as Record<string, unknown>)) as never;
		},
		async update(model, where, data) {
			const mapped = modelFor(model);
			const condition = buildWhere(mapped, where, { allowEmpty: false });
			const [row] = await db
				.update(mapped.table)
				.set(toDb(mapped, data as Record<string, unknown>) as never)
				.where(condition ?? undefined)
				.returning();
			if (!row) throw new Error(`@djs-commands/adapter-drizzle: no row matched update for model "${model}"`);
			return fromDb(mapped, row as Record<string, unknown>) as never;
		},
		async delete(model, where) {
			const mapped = modelFor(model);
			const condition = buildWhere(mapped, where, { allowEmpty: false });
			await db.delete(mapped.table).where(condition);
		},
		async count(model, where) {
			const mapped = modelFor(model);
			const condition = where ? buildWhere(mapped, where, { allowEmpty: true }) : undefined;
			const [row] = await db
				.select({ value: count() })
				.from(mapped.table)
				.where(condition ?? undefined);
			return row?.value ?? 0;
		},
	};
}

function resolveModels(options: DrizzleStorageOptions): Partial<Record<FrameworkStorageModel, ResolvedModel>> {
	if (!options?.models || typeof options.models !== "object") {
		throw new Error("@djs-commands/adapter-drizzle: options.models is required");
	}
	const models: Partial<Record<FrameworkStorageModel, ResolvedModel>> = {};
	for (const [model, rawMapping] of Object.entries(options.models)) {
		if (!isRecord(rawMapping)) {
			throw new Error(`@djs-commands/adapter-drizzle: invalid mapping for model "${model}"`);
		}
		const mapping = rawMapping as DrizzleModelMapping;
		if (!isRecord(mapping.fields)) {
			throw new Error(`@djs-commands/adapter-drizzle: model "${model}" must define a fields mapping`);
		}
		if (!isRecord(mapping.table)) {
			throw new Error(`@djs-commands/adapter-drizzle: model "${model}" must define a table mapping`);
		}
		assertRequiredStorageFields(model, new Set(Object.keys(mapping.fields)), "@djs-commands/adapter-drizzle");
		const frameworkModel = model as FrameworkStorageModel;
		models[frameworkModel] = {
			table: mapping.table,
			fields: mapping.fields,
			properties: resolveProperties(frameworkModel, mapping),
		};
	}
	return models;
}

function resolveProperties(model: FrameworkStorageModel, mapping: DrizzleModelMapping): Record<string, string> {
	const properties: Record<string, string> = {};
	const tableEntries = Object.entries(mapping.table as unknown as Record<string, unknown>);
	for (const [field, column] of Object.entries(mapping.fields)) {
		const property = tableEntries.find(([, value]) => value === column)?.[0];
		if (!property) {
			throw new Error(`@djs-commands/adapter-drizzle: field "${field}" for model "${model}" does not reference a column on its table`);
		}
		properties[field] = property;
	}
	return properties;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}
