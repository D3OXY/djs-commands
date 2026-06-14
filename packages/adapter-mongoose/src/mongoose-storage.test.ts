import { afterAll, describe, expect, test } from "bun:test";
import { GuildPrefixModel, runStorageConformance } from "@djs-commands/core";
import mongoose from "mongoose";
import { mongooseStorage } from "./index";

const MONGO_URL = process.env.MONGO_URL;

interface ModelCall {
	method: string;
	args: readonly unknown[];
}

interface MockQuery<T> {
	lean<U>(): { exec: () => Promise<U> };
	exec(): Promise<T>;
	sort(sort: Record<string, 1 | -1>): MockQuery<T>;
	skip(offset: number): MockQuery<T>;
	limit(limit: number): MockQuery<T>;
}

function mockQuery<T>(value: T): MockQuery<T> {
	const query: MockQuery<T> = {
		lean: <U>() => ({ exec: async () => value as unknown as U }),
		exec: async () => value,
		sort: () => query,
		skip: () => query,
		limit: () => query,
	};
	return query;
}

function createMockMongooseModel() {
	const calls: ModelCall[] = [];
	const model = {
		create: async (data: Record<string, unknown>) => {
			calls.push({ method: "create", args: [data] });
			return { toObject: () => ({ ...data, __v: 0 }) };
		},
		findOne: (where: Record<string, unknown>) => {
			calls.push({ method: "findOne", args: [where] });
			return mockQuery<Record<string, unknown> | null>(null);
		},
		find: (where: Record<string, unknown>) => {
			calls.push({ method: "find", args: [where] });
			return mockQuery<Record<string, unknown>[]>([]);
		},
		findOneAndUpdate: (where: Record<string, unknown>, update: Record<string, unknown>, opts: Record<string, unknown>) => {
			calls.push({ method: "findOneAndUpdate", args: [where, update, opts] });
			return mockQuery<Record<string, unknown> | null>(null);
		},
		deleteOne: (where: Record<string, unknown>) => {
			calls.push({ method: "deleteOne", args: [where] });
			return mockQuery({ acknowledged: true, deletedCount: 0 });
		},
		countDocuments: (where: Record<string, unknown>) => {
			calls.push({ method: "countDocuments", args: [where] });
			return mockQuery(0);
		},
	} as unknown as mongoose.Model<Record<string, unknown>>;
	return { model, calls };
}

const fakeModel = createMockMongooseModel().model;

async function tryConnect(url: string): Promise<mongoose.Connection | null> {
	const connection = mongoose.createConnection(url, {
		serverSelectionTimeoutMS: 3_000,
		connectTimeoutMS: 3_000,
	});
	// Swallow background errors so an unreachable host doesn't crash the test
	// process before the asPromise() awaiter rejects.
	connection.on("error", () => {});
	try {
		await connection.asPromise();
		return connection;
	} catch {
		try {
			await connection.close();
		} catch {
			// ignore
		}
		return null;
	}
}

const liveConnection = MONGO_URL ? await tryConnect(MONGO_URL) : null;

describe("mongooseStorage config validation", () => {
	test("missing mapping throws from assertModels", () => {
		const missing = mongooseStorage({ models: {} });
		expect(() => missing.assertModels?.([GuildPrefixModel])).toThrow(/missing mapping/);
	});

	test("constructor validates required field mappings", () => {
		expect(() =>
			mongooseStorage({
				models: {
					[GuildPrefixModel]: {
						model: fakeModel,
						fields: { guild_id: "serverId" },
					},
				},
			})
		).toThrow(/prefix/);
	});

	test("constructor validates mapping shape", () => {
		expect(() =>
			mongooseStorage({
				models: {
					[GuildPrefixModel]: null as unknown as never,
				},
			})
		).toThrow(/invalid mapping/);
	});

	test("constructor validates model methods", () => {
		expect(() =>
			mongooseStorage({
				models: {
					[GuildPrefixModel]: {
						model: { create: async () => ({ toObject: () => ({}) }) } as unknown as mongoose.Model<Record<string, unknown>>,
						fields: { guild_id: "serverId", prefix: "value" },
					},
				},
			})
		).toThrow(/Mongoose model.*findOne/);
	});

	test("constructor validates field mapping values", () => {
		expect(() =>
			mongooseStorage({
				models: {
					[GuildPrefixModel]: {
						model: fakeModel,
						fields: { guild_id: "serverId", prefix: 1 } as unknown as Record<string, string>,
					},
				},
			})
		).toThrow(/must map to a string property name/);
	});

	test("returns logical fields mapped from _id", async () => {
		const { model } = createMockMongooseModel();
		const storage = mongooseStorage({
			models: {
				[GuildPrefixModel]: {
					model,
					fields: { guild_id: "_id", prefix: "value" },
				},
			},
		});

		const created = await storage.create(GuildPrefixModel, { guild_id: "g1", prefix: "!" });

		expect(created).toEqual({ guild_id: "g1", prefix: "!" });
	});

	test("update and delete reject empty where clauses", async () => {
		const { model, calls } = createMockMongooseModel();
		const storage = mongooseStorage({
			models: {
				[GuildPrefixModel]: {
					model,
					fields: { guild_id: "serverId", prefix: "value" },
				},
			},
		});

		await expect(storage.update(GuildPrefixModel, {}, { prefix: "!" })).rejects.toThrow(/mutating operations require at least one where condition/);
		await expect(storage.delete(GuildPrefixModel, {})).rejects.toThrow(/mutating operations require at least one where condition/);
		expect(calls.some((call) => call.method === "findOneAndUpdate" || call.method === "deleteOne")).toBe(false);
	});
});

if (liveConnection) {
	const guildPrefixSchema = new mongoose.Schema(
		{
			serverId: { type: String, required: true, unique: true },
			value: { type: String, required: true },
		},
		{ collection: "guild_prefix", versionKey: false }
	);
	const GuildPrefix = liveConnection.model("AppGuildPrefix", guildPrefixSchema);
	const storage = mongooseStorage({
		models: {
			[GuildPrefixModel]: {
				model: GuildPrefix as unknown as mongoose.Model<Record<string, unknown>>,
				fields: { guild_id: "serverId", prefix: "value" },
			},
		},
	});

	describe("mongooseStorage (integration)", () => {
		afterAll(async () => {
			try {
				await liveConnection.close();
			} catch {
				// ignore
			}
		});

		runStorageConformance("mongoose", async () => storage);
	});
} else {
	describe.skip("mongooseStorage (MONGO_URL not set or unreachable)", () => {
		test("integration tests skipped", () => {});
	});
}
