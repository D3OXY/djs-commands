import { afterAll, describe, expect, test } from "bun:test";
import { GuildPrefixModel, runStorageConformance } from "@djs-commands/core";
import mongoose from "mongoose";
import { mongooseStorage } from "./index";

const MONGO_URL = process.env.MONGO_URL;
const fakeModel = {} as mongoose.Model<Record<string, unknown>>;

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

	test("returns logical fields mapped from _id", async () => {
		const model = {
			create: async (data: Record<string, unknown>) => ({
				toObject: () => ({ ...data, __v: 0 }),
			}),
		} as unknown as mongoose.Model<Record<string, unknown>>;
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
