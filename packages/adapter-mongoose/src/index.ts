import { assertRequiredStorageFields, type FrameworkStorageModel, type Storage, type StorageFindOpts } from "@djs-commands/core";
import type mongoose from "mongoose";

export interface MongooseModelMapping {
	model: mongoose.Model<Record<string, unknown>>;
	fields: Record<string, string>;
}

export interface MongooseStorageOptions {
	models: Partial<Record<FrameworkStorageModel, MongooseModelMapping>>;
}

export function mongooseStorage(options: MongooseStorageOptions): Storage {
	const models = resolveModels(options);

	const modelFor = (name: string): MongooseModelMapping => {
		const mapped = models[name as FrameworkStorageModel];
		if (!mapped) throw new Error(`@djs-commands/adapter-mongoose: missing mapping for model "${name}"`);
		return mapped;
	};

	const toDb = (mapped: MongooseModelMapping, data: Record<string, unknown>): Record<string, unknown> => {
		const out: Record<string, unknown> = {};
		for (const [field, value] of Object.entries(data)) {
			const property = mapped.fields[field];
			if (!property) throw new Error(`@djs-commands/adapter-mongoose: unknown mapped field "${field}"`);
			out[property] = value;
		}
		return out;
	};

	const toDbWhere = (mapped: MongooseModelMapping, where: Record<string, unknown>, opts: { allowEmpty: boolean }): Record<string, unknown> => {
		const out = toDb(mapped, where);
		if (!opts.allowEmpty && Object.keys(out).length === 0) {
			throw new Error("@djs-commands/adapter-mongoose: mutating operations require at least one where condition");
		}
		return out;
	};

	const fromDb = (mapped: MongooseModelMapping, doc: Record<string, unknown>): Record<string, unknown> => {
		const out: Record<string, unknown> = {};
		for (const [field, property] of Object.entries(mapped.fields)) out[field] = doc[property];
		return out;
	};

	return {
		assertModels(required) {
			for (const model of required) modelFor(model);
		},
		async create(name, data) {
			const mapped = modelFor(name);
			const created = await mapped.model.create(toDb(mapped, data as Record<string, unknown>));
			return fromDb(mapped, stripVersionKey(created.toObject())) as never;
		},
		async findOne(name, where) {
			const mapped = modelFor(name);
			const doc = await mapped.model.findOne(toDb(mapped, where)).lean<Record<string, unknown> | null>().exec();
			return doc ? (fromDb(mapped, stripVersionKey(doc)) as never) : null;
		},
		async findMany(name, opts: StorageFindOpts = {}) {
			const mapped = modelFor(name);
			let q = mapped.model.find(opts.where ? toDb(mapped, opts.where) : {});
			if (opts.orderBy) {
				const property = mapped.fields[opts.orderBy.field];
				if (!property) throw new Error(`@djs-commands/adapter-mongoose: unknown mapped field "${opts.orderBy.field}"`);
				q = q.sort({ [property]: opts.orderBy.direction === "desc" ? -1 : 1 });
			}
			if (opts.offset !== undefined) q = q.skip(opts.offset);
			if (opts.limit !== undefined) q = q.limit(opts.limit);
			const rows = await q.lean<Record<string, unknown>[]>().exec();
			return rows.map((row) => fromDb(mapped, stripVersionKey(row))) as never;
		},
		async update(name, where, data) {
			const mapped = modelFor(name);
			const updated = await mapped.model
				.findOneAndUpdate(toDbWhere(mapped, where, { allowEmpty: false }), { $set: toDb(mapped, data as Record<string, unknown>) }, { new: true })
				.lean<Record<string, unknown> | null>()
				.exec();
			if (!updated) throw new Error(`@djs-commands/adapter-mongoose: no document matched update for model "${name}"`);
			return fromDb(mapped, stripVersionKey(updated)) as never;
		},
		async delete(name, where) {
			const mapped = modelFor(name);
			await mapped.model.deleteOne(toDbWhere(mapped, where, { allowEmpty: false })).exec();
		},
		async count(name, where) {
			const mapped = modelFor(name);
			return mapped.model.countDocuments(where ? toDb(mapped, where) : {}).exec();
		},
	};
}

const MONGOOSE_MODEL_METHODS = ["create", "findOne", "find", "findOneAndUpdate", "deleteOne", "countDocuments"] as const;

function resolveModels(options: MongooseStorageOptions): Partial<Record<FrameworkStorageModel, MongooseModelMapping>> {
	if (!options?.models || typeof options.models !== "object") {
		throw new Error("@djs-commands/adapter-mongoose: options.models is required");
	}
	const models: Partial<Record<FrameworkStorageModel, MongooseModelMapping>> = {};
	for (const [model, rawMapping] of Object.entries(options.models)) {
		if (!isRecord(rawMapping)) {
			throw new Error(`@djs-commands/adapter-mongoose: invalid mapping for model "${model}"`);
		}
		const mapping = rawMapping as MongooseModelMapping;
		if (!isObjectLike(mapping.model)) {
			throw new Error(`@djs-commands/adapter-mongoose: model "${model}" must define a Mongoose model`);
		}
		assertMethods(mapping.model, MONGOOSE_MODEL_METHODS, `@djs-commands/adapter-mongoose: model "${model}" must define a Mongoose model`);
		if (!isRecord(mapping.fields)) {
			throw new Error(`@djs-commands/adapter-mongoose: model "${model}" must define a fields mapping`);
		}
		assertStringFieldValues(model, mapping.fields, "@djs-commands/adapter-mongoose");
		assertRequiredStorageFields(model, new Set(Object.keys(mapping.fields)), "@djs-commands/adapter-mongoose");
		models[model as FrameworkStorageModel] = mapping;
	}
	return models;
}

function stripVersionKey(doc: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(doc)) {
		if (key === "__v") continue;
		out[key] = value;
	}
	return out;
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
