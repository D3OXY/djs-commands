import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "./scaffold";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "djs-commands-cli-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

test("scaffolds a baseline bot with the bun + drizzle defaults", async () => {
	const result = await scaffold(
		{
			projectName: "test-bot",
			adapter: "drizzle",
			legacy: false,
			componentsV2: false,
			packageManager: "bun",
			initGit: false,
		},
		{ cwd: dir, skipInstall: true, stdio: "ignore" }
	);

	expect(result.files.sort()).toEqual([
		".env.example",
		".gitignore",
		"README.md",
		"package.json",
		"src/commands/ping.ts",
		"src/db/schema.ts",
		"src/index.ts",
		"src/storage.ts",
		"tsconfig.json",
	]);

	const pkg = JSON.parse(await readFile(join(result.targetDir, "package.json"), "utf8"));
	expect(pkg.name).toBe("test-bot");
	expect(pkg.dependencies["@djs-commands/core"]).toBeDefined();
	expect(pkg.dependencies["@djs-commands/adapter-drizzle"]).toBeDefined();
	expect(pkg.dependencies["drizzle-orm"]).toBeDefined();
	expect(pkg.dependencies.pg).toBeDefined();

	const storage = await readFile(join(result.targetDir, "src/storage.ts"), "utf8");
	expect(storage).toContain("[GuildPrefixModel]");
	expect(storage).toContain("fields:");
	expect(storage).toContain("DATABASE_URL environment variable is required");
});

test("adapter=none excludes ORM dependencies", async () => {
	const result = await scaffold(
		{
			projectName: "no-db-bot",
			adapter: "none",
			legacy: false,
			componentsV2: false,
			packageManager: "bun",
			initGit: false,
		},
		{ cwd: dir, skipInstall: true, stdio: "ignore" }
	);

	const pkg = JSON.parse(await readFile(join(result.targetDir, "package.json"), "utf8"));
	expect(pkg.dependencies["drizzle-orm"]).toBeUndefined();
	expect(pkg.dependencies["@prisma/client"]).toBeUndefined();
	expect(pkg.dependencies.mongoose).toBeUndefined();
});

test("adapter=prisma adds prisma + @prisma/client", async () => {
	const result = await scaffold(
		{
			projectName: "prisma-bot",
			adapter: "prisma",
			legacy: false,
			componentsV2: false,
			packageManager: "bun",
			initGit: false,
		},
		{ cwd: dir, skipInstall: true, stdio: "ignore" }
	);

	const pkg = JSON.parse(await readFile(join(result.targetDir, "package.json"), "utf8"));
	expect(pkg.dependencies["@djs-commands/adapter-prisma"]).toBeDefined();
	expect(pkg.dependencies["@prisma/client"]).toBeDefined();
	expect(pkg.devDependencies.prisma).toBeDefined();
	expect(result.files).toContain("prisma/schema.prisma");
});

test("adapter=mongoose adds mongoose and a Mongo URL in env", async () => {
	const result = await scaffold(
		{
			projectName: "mongo-bot",
			adapter: "mongoose",
			legacy: false,
			componentsV2: false,
			packageManager: "bun",
			initGit: false,
		},
		{ cwd: dir, skipInstall: true, stdio: "ignore" }
	);

	const pkg = JSON.parse(await readFile(join(result.targetDir, "package.json"), "utf8"));
	expect(pkg.dependencies.mongoose).toBeDefined();

	const env = await readFile(join(result.targetDir, ".env.example"), "utf8");
	expect(env).toContain("MONGO_URL=");
	expect(result.files).toContain("src/db/models.ts");

	const storage = await readFile(join(result.targetDir, "src/storage.ts"), "utf8");
	expect(storage).toContain("MONGO_URL environment variable is required");
});

test("legacy mode is reflected in src/index.ts and src/commands/ping.ts", async () => {
	const result = await scaffold(
		{
			projectName: "legacy-bot",
			adapter: "none",
			legacy: true,
			componentsV2: false,
			packageManager: "bun",
			initGit: false,
		},
		{ cwd: dir, skipInstall: true, stdio: "ignore" }
	);

	const index = await readFile(join(result.targetDir, "src/index.ts"), "utf8");
	expect(index).toContain("legacy: { enabled: true");
	expect(index).toContain("storageFeatures: { guildPrefixes: false }");
	expect(index).toContain("GatewayIntentBits.MessageContent");

	const ping = await readFile(join(result.targetDir, "src/commands/ping.ts"), "utf8");
	expect(ping).toContain("legacy:");
});

test("componentsV2 adds @djs-commands/jsx", async () => {
	const result = await scaffold(
		{
			projectName: "jsx-bot",
			adapter: "none",
			legacy: false,
			componentsV2: true,
			packageManager: "bun",
			initGit: false,
		},
		{ cwd: dir, skipInstall: true, stdio: "ignore" }
	);

	const pkg = JSON.parse(await readFile(join(result.targetDir, "package.json"), "utf8"));
	expect(pkg.dependencies["@djs-commands/jsx"]).toBeDefined();
});

test("packageManager=pnpm uses tsx for dev script", async () => {
	const result = await scaffold(
		{
			projectName: "pnpm-bot",
			adapter: "none",
			legacy: false,
			componentsV2: false,
			packageManager: "pnpm",
			initGit: false,
		},
		{ cwd: dir, skipInstall: true, stdio: "ignore" }
	);

	const pkg = JSON.parse(await readFile(join(result.targetDir, "package.json"), "utf8"));
	expect(pkg.scripts.dev).toContain("tsx");
	expect(pkg.devDependencies.tsx).toBeDefined();
});
