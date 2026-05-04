import { afterAll, describe, test } from "bun:test";
import { runStorageConformance } from "@djs-commands/core";
import mongoose from "mongoose";
import { mongooseStorage } from "./index";

const MONGO_URL = process.env.MONGO_URL;

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

if (liveConnection) {
	const storage = mongooseStorage(liveConnection);

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
