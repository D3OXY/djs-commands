import { assertRequiredStorageFields, type FrameworkStorageModel, type Storage, type StorageFindOpts } from "@djs-commands/core";

export type PrismaDelegate = {
	create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
	findFirst: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
	findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; take?: number; skip?: number }) => Promise<Record<string, unknown>[]>;
	updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
	deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
	count: (args: { where?: Record<string, unknown> }) => Promise<number>;
};

export interface PrismaModelMapping {
	delegate: PrismaDelegate;
	fields: Record<string, string>;
}

export interface PrismaStorageOptions {
	models: Partial<Record<FrameworkStorageModel, PrismaModelMapping>>;
}

export function prismaStorage(options: PrismaStorageOptions): Storage {
	const models = resolveModels(options);

	const modelFor = (model: string): PrismaModelMapping => {
		const mapped = models[model as FrameworkStorageModel];
		if (!mapped) throw new Error(`@djs-commands/adapter-prisma: missing mapping for model "${model}"`);
		return mapped;
	};

	const toDb = (mapped: PrismaModelMapping, data: Record<string, unknown>): Record<string, unknown> => {
		const out: Record<string, unknown> = {};
		for (const [field, value] of Object.entries(data)) {
			const property = mapped.fields[field];
			if (!property) throw new Error(`@djs-commands/adapter-prisma: unknown mapped field "${field}"`);
			out[property] = value;
		}
		return out;
	};

	const toDbWhere = (mapped: PrismaModelMapping, where: Record<string, unknown>, opts: { allowEmpty: boolean }): Record<string, unknown> => {
		const out = toDb(mapped, where);
		if (!opts.allowEmpty && Object.keys(out).length === 0) {
			throw new Error("@djs-commands/adapter-prisma: mutating operations require at least one where condition");
		}
		return out;
	};

	const fromDb = (mapped: PrismaModelMapping, row: Record<string, unknown>): Record<string, unknown> => {
		const out: Record<string, unknown> = {};
		for (const [field, property] of Object.entries(mapped.fields)) out[field] = row[property];
		return out;
	};

	return {
		assertModels(required) {
			for (const model of required) modelFor(model);
		},
		async create(model, data) {
			const mapped = modelFor(model);
			const row = await mapped.delegate.create({ data: toDb(mapped, data as Record<string, unknown>) });
			return fromDb(mapped, row) as never;
		},
		async findOne(model, where) {
			const mapped = modelFor(model);
			const row = await mapped.delegate.findFirst({ where: toDb(mapped, where) });
			return row ? (fromDb(mapped, row) as never) : null;
		},
		async findMany(model, opts: StorageFindOpts = {}) {
			const mapped = modelFor(model);
			const args: Parameters<PrismaDelegate["findMany"]>[0] = {};
			if (opts.where) args.where = toDb(mapped, opts.where);
			if (opts.orderBy) {
				const property = mapped.fields[opts.orderBy.field];
				if (!property) throw new Error(`@djs-commands/adapter-prisma: unknown mapped field "${opts.orderBy.field}"`);
				args.orderBy = { [property]: opts.orderBy.direction };
			}
			if (opts.limit !== undefined) args.take = opts.limit;
			if (opts.offset !== undefined) args.skip = opts.offset;
			const rows = await mapped.delegate.findMany(args);
			return rows.map((row) => fromDb(mapped, row)) as never;
		},
		async update(model, where, data) {
			const mapped = modelFor(model);
			const mappedWhere = toDbWhere(mapped, where, { allowEmpty: false });
			const result = await mapped.delegate.updateMany({
				where: mappedWhere,
				data: toDb(mapped, data as Record<string, unknown>),
			});
			if (result.count === 0) throw new Error(`@djs-commands/adapter-prisma: no row matched update for model "${model}"`);
			const row = await mapped.delegate.findFirst({ where: mappedWhere });
			if (!row) throw new Error(`@djs-commands/adapter-prisma: row vanished after update for model "${model}"`);
			return fromDb(mapped, row) as never;
		},
		async delete(model, where) {
			const mapped = modelFor(model);
			await mapped.delegate.deleteMany({ where: toDbWhere(mapped, where, { allowEmpty: false }) });
		},
		async count(model, where) {
			const mapped = modelFor(model);
			const args: Parameters<PrismaDelegate["count"]>[0] = {};
			if (where) args.where = toDb(mapped, where);
			return await mapped.delegate.count(args);
		},
	};
}

const PRISMA_DELEGATE_METHODS = ["create", "findFirst", "findMany", "updateMany", "deleteMany", "count"] as const;

function resolveModels(options: PrismaStorageOptions): Partial<Record<FrameworkStorageModel, PrismaModelMapping>> {
	if (!options?.models || typeof options.models !== "object") {
		throw new Error("@djs-commands/adapter-prisma: options.models is required");
	}
	const models: Partial<Record<FrameworkStorageModel, PrismaModelMapping>> = {};
	for (const [model, rawMapping] of Object.entries(options.models)) {
		if (!isRecord(rawMapping)) {
			throw new Error(`@djs-commands/adapter-prisma: invalid mapping for model "${model}"`);
		}
		const mapping = rawMapping as PrismaModelMapping;
		assertMethods(mapping.delegate, PRISMA_DELEGATE_METHODS, `@djs-commands/adapter-prisma: model "${model}" must define a Prisma delegate`);
		if (!isRecord(mapping.fields)) {
			throw new Error(`@djs-commands/adapter-prisma: model "${model}" must define a fields mapping`);
		}
		assertStringFieldValues(model, mapping.fields, "@djs-commands/adapter-prisma");
		assertRequiredStorageFields(model, new Set(Object.keys(mapping.fields)), "@djs-commands/adapter-prisma");
		models[model as FrameworkStorageModel] = mapping;
	}
	return models;
}

function assertStringFieldValues(model: string, fields: Record<string, unknown>, adapterName: string): asserts fields is Record<string, string> {
	for (const [field, property] of Object.entries(fields)) {
		if (typeof property !== "string") {
			throw new Error(`${adapterName}: field "${field}" for model "${model}" must map to a string property name`);
		}
	}
}

function assertMethods(value: unknown, methods: readonly string[], message: string): void {
	if (!isObjectLike(value)) {
		throw new Error(message);
	}
	const target = value as Record<string, unknown>;
	for (const method of methods) {
		if (typeof target[method] !== "function") {
			throw new Error(`${message} with method "${method}"`);
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object";
}

function isObjectLike(value: unknown): value is object {
	return (value !== null && typeof value === "object") || typeof value === "function";
}
