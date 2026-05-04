import { ChannelLocksModel, DisabledCommandsModel, GuildPrefixModel, type Storage, type StorageFindOpts, type StorageWhere } from "@djs-commands/core";
import type mongoose from "mongoose";
import { type ChannelLockDoc, createChannelLockModel, createDisabledCommandModel, createGuildPrefixModel, type DisabledCommandDoc, type GuildPrefixDoc } from "./models";

export type { ChannelLockDoc, DisabledCommandDoc, GuildPrefixDoc } from "./models";
export { createChannelLockModel, createDisabledCommandModel, createGuildPrefixModel } from "./models";

interface ModelMap {
	[GuildPrefixModel]: mongoose.Model<GuildPrefixDoc>;
	[DisabledCommandsModel]: mongoose.Model<DisabledCommandDoc>;
	[ChannelLocksModel]: mongoose.Model<ChannelLockDoc>;
}

interface MongooseStorageOptions {
	models?: {
		guildPrefix?: mongoose.Model<GuildPrefixDoc>;
		disabledCommands?: mongoose.Model<DisabledCommandDoc>;
		channelLocks?: mongoose.Model<ChannelLockDoc>;
	};
}

/**
 * Returns a `Storage` implementation backed by Mongoose. Models the framework
 * knows about (GuildPrefix, DisabledCommands, ChannelLocks) are mapped to their
 * Mongoose models. Unknown models throw — adapters that don't recognize a model
 * name should fail loud, not silently no-op.
 *
 * Bring-your-own-models: pass `options.models` to override defaults if you've
 * already registered a compatible model on the connection.
 */
export function mongooseStorage(connection: mongoose.Connection, options: MongooseStorageOptions = {}): Storage {
	const models: ModelMap = {
		[GuildPrefixModel]: options.models?.guildPrefix ?? createGuildPrefixModel(connection),
		[DisabledCommandsModel]: options.models?.disabledCommands ?? createDisabledCommandModel(connection),
		[ChannelLocksModel]: options.models?.channelLocks ?? createChannelLockModel(connection),
	};

	const modelFor = (name: string): mongoose.Model<Record<string, unknown>> => {
		const model = models[name as keyof ModelMap];
		if (!model) throw new Error(`@djs-commands/adapter-mongoose: unknown model "${name}"`);
		return model as unknown as mongoose.Model<Record<string, unknown>>;
	};

	return {
		async create(name, data) {
			const model = modelFor(name);
			const created = await model.create(data);
			return stripInternalFields(created.toObject()) as never;
		},
		async findOne(name, where) {
			const model = modelFor(name);
			const doc = await model
				.findOne(where as StorageWhere)
				.lean<Record<string, unknown> | null>()
				.exec();
			return doc ? (stripInternalFields(doc) as never) : null;
		},
		async findMany(name, opts: StorageFindOpts = {}) {
			const model = modelFor(name);
			let q = model.find((opts.where ?? {}) as StorageWhere);
			if (opts.orderBy) {
				q = q.sort({ [opts.orderBy.field]: opts.orderBy.direction === "desc" ? -1 : 1 });
			}
			if (opts.offset !== undefined) q = q.skip(opts.offset);
			if (opts.limit !== undefined) q = q.limit(opts.limit);
			const rows = await q.lean<Record<string, unknown>[]>().exec();
			return rows.map((r) => stripInternalFields(r)) as never;
		},
		async update(name, where, data) {
			const model = modelFor(name);
			const updated = await model
				.findOneAndUpdate(where as StorageWhere, { $set: data }, { new: true })
				.lean<Record<string, unknown> | null>()
				.exec();
			if (!updated) throw new Error(`@djs-commands/adapter-mongoose: no document matched update for model "${name}"`);
			return stripInternalFields(updated) as never;
		},
		async delete(name, where) {
			const model = modelFor(name);
			await model.deleteOne(where as StorageWhere).exec();
		},
		async count(name, where) {
			const model = modelFor(name);
			return model.countDocuments((where ?? {}) as StorageWhere).exec();
		},
	};
}

/**
 * Removes Mongo's internal `_id` and `__v` fields from a plain document.
 * `_id: false` + `versionKey: false` on the schema prevent these from
 * appearing in the first place, but a defensive strip protects against
 * caller-provided models that don't share those options.
 */
function stripInternalFields(doc: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(doc)) {
		if (k === "_id" || k === "__v") continue;
		out[k] = v;
	}
	return out;
}
