import type { Adapter, PackageManager, ScaffoldOptions } from "./options";

interface FileContent {
	path: string;
	content: string;
}

const DEPS = {
	core: "^2.0.0",
	jsx: "^2.0.0",
	adapterDrizzle: "^2.0.0",
	adapterPrisma: "^2.0.0",
	adapterMongoose: "^2.0.0",
	discordJs: "^14.26.0",
	drizzleOrm: "^0.36.4",
	pg: "^8.13.1",
	prismaClient: "^5.22.0",
	mongoose: "^8.8.0",
	typescript: "^5.9.3",
	typesNode: "^22.0.0",
	tsx: "^4.21.0",
} as const;

function packageJson(opts: ScaffoldOptions): string {
	const dependencies: Record<string, string> = {
		"@djs-commands/core": DEPS.core,
		"discord.js": DEPS.discordJs,
	};
	if (opts.componentsV2) dependencies["@djs-commands/jsx"] = DEPS.jsx;
	if (opts.adapter === "drizzle") {
		dependencies["@djs-commands/adapter-drizzle"] = DEPS.adapterDrizzle;
		dependencies["drizzle-orm"] = DEPS.drizzleOrm;
		dependencies.pg = DEPS.pg;
	}
	if (opts.adapter === "prisma") {
		dependencies["@djs-commands/adapter-prisma"] = DEPS.adapterPrisma;
		dependencies["@prisma/client"] = DEPS.prismaClient;
	}
	if (opts.adapter === "mongoose") {
		dependencies["@djs-commands/adapter-mongoose"] = DEPS.adapterMongoose;
		dependencies.mongoose = DEPS.mongoose;
	}

	const devDependencies: Record<string, string> = {
		"@types/node": DEPS.typesNode,
		typescript: DEPS.typescript,
	};
	if (opts.packageManager !== "bun") devDependencies.tsx = DEPS.tsx;
	if (opts.adapter === "prisma") devDependencies.prisma = DEPS.prismaClient;

	const dev = opts.packageManager === "bun" ? "bun run --watch src/index.ts" : "tsx watch src/index.ts";
	const start = opts.packageManager === "bun" ? "bun run src/index.ts" : "tsx src/index.ts";

	const pkg = {
		name: opts.projectName,
		version: "0.0.0",
		private: true,
		type: "module",
		scripts: {
			dev,
			start,
			typecheck: "tsc --noEmit",
		},
		dependencies,
		devDependencies,
	};

	return JSON.stringify(pkg, null, "\t");
}

function tsconfigJson(): string {
	return JSON.stringify(
		{
			compilerOptions: {
				strict: true,
				skipLibCheck: true,
				module: "ESNext",
				moduleResolution: "Bundler",
				target: "ES2022",
				lib: ["ES2022"],
				esModuleInterop: true,
				resolveJsonModule: true,
				noEmit: true,
				types: ["node"],
			},
			include: ["src/**/*"],
		},
		null,
		"\t"
	);
}

function gitignore(): string {
	return ["node_modules/", "dist/", ".env", "*.log", ".DS_Store", ""].join("\n");
}

function envExample(adapter: Adapter): string {
	const lines = ["DISCORD_TOKEN=your-bot-token-here"];
	if (adapter === "drizzle" || adapter === "prisma") {
		lines.push("DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres");
	}
	if (adapter === "mongoose") {
		lines.push("MONGO_URL=mongodb://localhost:27017/mybot");
	}
	return `${lines.join("\n")}\n`;
}

function indexTs(opts: ScaffoldOptions): string {
	const imports = [`import { createCommandHandler } from "@djs-commands/core";`, `import { Client, GatewayIntentBits } from "discord.js";`];
	const intents = ["GatewayIntentBits.Guilds"];
	if (opts.legacy) {
		intents.push("GatewayIntentBits.GuildMessages");
		intents.push("GatewayIntentBits.MessageContent");
	}

	const storageSetup = "";
	let storageOption = "";
	if (opts.adapter !== "none") {
		imports.push(`import { storage } from "./storage";`);
		storageOption = "\n\tstorage,";
	}

	const dirImport = opts.packageManager === "bun" ? '"./commands"' : 'fileURLToPath(new URL("./commands", import.meta.url))';
	if (opts.packageManager !== "bun") {
		imports.unshift(`import { fileURLToPath } from "node:url";`);
	}

	const legacyOption = opts.legacy ? '\n\tlegacy: { enabled: true, defaultPrefix: "!" },' : "";

	return `${imports.join("\n")}
${storageSetup}
const token = process.env.DISCORD_TOKEN;
if (!token) {
\tconsole.error("DISCORD_TOKEN environment variable is required");
\tprocess.exit(1);
}

const client = new Client({ intents: [${intents.join(", ")}] });

const handler = createCommandHandler({
\tclient,
\tcommandDir: ${dirImport},${storageOption}${legacyOption}
});

handler.ready.catch((err) => {
\tconsole.error("Boot failed:", err);
\tprocess.exit(1);
});

client.once("clientReady", (c) => {
\tconsole.log(\`Logged in as \${c.user.tag}\`);
});

await client.login(token);
`;
}

function storageTs(adapter: Adapter): string | null {
	if (adapter === "drizzle") {
		return `import { drizzleStorage } from "@djs-commands/adapter-drizzle";
import { ChannelLocksModel, DisabledCommandsModel, GuildPrefixModel } from "@djs-commands/core";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { channelLocks, disabledCommands, guildPrefixes } from "./db/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export const storage = drizzleStorage(db, {
\tmodels: {
\t\t[GuildPrefixModel]: {
\t\t\ttable: guildPrefixes,
\t\t\tfields: { guild_id: guildPrefixes.guildId, prefix: guildPrefixes.prefix },
\t\t},
\t\t[DisabledCommandsModel]: {
\t\t\ttable: disabledCommands,
\t\t\tfields: { guild_id: disabledCommands.guildId, command_name: disabledCommands.commandName },
\t\t},
\t\t[ChannelLocksModel]: {
\t\t\ttable: channelLocks,
\t\t\tfields: { guild_id: channelLocks.guildId, command_name: channelLocks.commandName, channel_id: channelLocks.channelId },
\t\t},
\t},
});
`;
	}
	if (adapter === "prisma") {
		return `import { prismaStorage, type PrismaDelegate } from "@djs-commands/adapter-prisma";
import { ChannelLocksModel, DisabledCommandsModel, GuildPrefixModel } from "@djs-commands/core";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const storage = prismaStorage({
\tmodels: {
\t\t[GuildPrefixModel]: {
\t\t\tdelegate: prisma.guildPrefix as PrismaDelegate,
\t\t\tfields: { guild_id: "guildId", prefix: "prefix" },
\t\t},
\t\t[DisabledCommandsModel]: {
\t\t\tdelegate: prisma.disabledCommand as PrismaDelegate,
\t\t\tfields: { guild_id: "guildId", command_name: "commandName" },
\t\t},
\t\t[ChannelLocksModel]: {
\t\t\tdelegate: prisma.channelLock as PrismaDelegate,
\t\t\tfields: { guild_id: "guildId", command_name: "commandName", channel_id: "channelId" },
\t\t},
\t},
});
`;
	}
	if (adapter === "mongoose") {
		return `import { mongooseStorage } from "@djs-commands/adapter-mongoose";
import { ChannelLocksModel, DisabledCommandsModel, GuildPrefixModel } from "@djs-commands/core";
import mongoose from "mongoose";
import { ChannelLock, DisabledCommand, GuildPrefix } from "./db/models";

mongoose.connect(process.env.MONGO_URL!);

export const storage = mongooseStorage({
\tmodels: {
\t\t[GuildPrefixModel]: {
\t\t\tmodel: GuildPrefix as unknown as mongoose.Model<Record<string, unknown>>,
\t\t\tfields: { guild_id: "guildId", prefix: "prefix" },
\t\t},
\t\t[DisabledCommandsModel]: {
\t\t\tmodel: DisabledCommand as unknown as mongoose.Model<Record<string, unknown>>,
\t\t\tfields: { guild_id: "guildId", command_name: "commandName" },
\t\t},
\t\t[ChannelLocksModel]: {
\t\t\tmodel: ChannelLock as unknown as mongoose.Model<Record<string, unknown>>,
\t\t\tfields: { guild_id: "guildId", command_name: "commandName", channel_id: "channelId" },
\t\t},
\t},
});
`;
	}
	return null;
}

function drizzleSchemaTs(): string {
	return `import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const guildPrefixes = pgTable("guild_prefixes", {
\tguildId: text("guild_id").primaryKey(),
\tprefix: text("prefix").notNull(),
});

export const disabledCommands = pgTable(
\t"disabled_commands",
\t{
\t\tguildId: text("guild_id").notNull(),
\t\tcommandName: text("command_name").notNull(),
\t},
\t(t) => [primaryKey({ columns: [t.guildId, t.commandName] })]
);

export const channelLocks = pgTable(
\t"channel_locks",
\t{
\t\tguildId: text("guild_id").notNull(),
\t\tcommandName: text("command_name").notNull(),
\t\tchannelId: text("channel_id").notNull(),
\t},
\t(t) => [primaryKey({ columns: [t.guildId, t.commandName, t.channelId] })]
);
`;
}

function mongooseModelsTs(): string {
	return `import mongoose from "mongoose";

export const GuildPrefix = mongoose.model(
\t"GuildPrefix",
\tnew mongoose.Schema(
\t\t{
\t\t\tguildId: { type: String, required: true, unique: true },
\t\t\tprefix: { type: String, required: true },
\t\t},
\t\t{ collection: "guild_prefixes" }
\t)
);

const disabledCommandSchema = new mongoose.Schema(
\t{
\t\tguildId: { type: String, required: true },
\t\tcommandName: { type: String, required: true },
\t},
\t{ collection: "disabled_commands" }
);
disabledCommandSchema.index({ guildId: 1, commandName: 1 }, { unique: true });
export const DisabledCommand = mongoose.model("DisabledCommand", disabledCommandSchema);

const channelLockSchema = new mongoose.Schema(
\t{
\t\tguildId: { type: String, required: true },
\t\tcommandName: { type: String, required: true },
\t\tchannelId: { type: String, required: true },
\t},
\t{ collection: "channel_locks" }
);
channelLockSchema.index({ guildId: 1, commandName: 1, channelId: 1 }, { unique: true });
export const ChannelLock = mongoose.model("ChannelLock", channelLockSchema);
`;
}

function prismaSchema(): string {
	return `datasource db {
\tprovider = "postgresql"
\turl      = env("DATABASE_URL")
}

generator client {
\tprovider = "prisma-client-js"
}

model GuildPrefix {
\tguildId String @id @map("guild_id")
\tprefix  String

\t@@map("guild_prefixes")
}

model DisabledCommand {
\tguildId     String @map("guild_id")
\tcommandName String @map("command_name")

\t@@id([guildId, commandName])
\t@@map("disabled_commands")
}

model ChannelLock {
\tguildId     String @map("guild_id")
\tcommandName String @map("command_name")
\tchannelId   String @map("channel_id")

\t@@id([guildId, commandName, channelId])
\t@@map("channel_locks")
}
`;
}

function pingCommandTs(opts: ScaffoldOptions): string {
	const legacyConfig = opts.legacy ? `,\n\tlegacy: { enabled: true, aliases: ["p"] }` : "";
	return `import { defineCommand } from "@djs-commands/core";

export default defineCommand({
\tname: "ping",
\tdescription: "Replies with pong"${legacyConfig},
\trun: async (ctx) => {
\t\tawait ctx.reply("pong");
\t},
});
`;
}

function readme(opts: ScaffoldOptions): string {
	const installCmd = opts.packageManager === "bun" ? "bun install" : opts.packageManager === "pnpm" ? "pnpm install" : "npm install";
	const devCmd = opts.packageManager === "bun" ? "bun run dev" : opts.packageManager === "pnpm" ? "pnpm dev" : "npm run dev";
	const dbSetup =
		opts.adapter === "drizzle"
			? `\n## Database (Postgres + Drizzle)

\`\`\`bash
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres:16
\`\`\`

Then push the schema using drizzle-kit (see [@djs-commands/adapter-drizzle](https://github.com/D3OXY/djs-commands/tree/main/packages/adapter-drizzle) for the model fragment).
`
			: opts.adapter === "prisma"
				? `\n## Database (Postgres + Prisma)

\`\`\`bash
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres:16
${opts.packageManager} prisma migrate dev
\`\`\`
`
				: opts.adapter === "mongoose"
					? `\n## Database (MongoDB + Mongoose)

\`\`\`bash
docker run --rm -p 27017:27017 -d mongo:7
\`\`\`
`
					: "";

	return `# ${opts.projectName}

Scaffolded with \`create-djs-commands\`.

## Setup

\`\`\`bash
${installCmd}
cp .env.example .env  # add your DISCORD_TOKEN
${devCmd}
\`\`\`
${dbSetup}
## Adding commands

Drop a \`defineCommand({...})\` default export into \`src/commands/\` — it'll auto-load on save.
`;
}

export function buildFiles(opts: ScaffoldOptions): FileContent[] {
	const files = [
		{ path: "package.json", content: packageJson(opts) },
		{ path: "tsconfig.json", content: tsconfigJson() },
		{ path: ".gitignore", content: gitignore() },
		{ path: ".env.example", content: envExample(opts.adapter) },
		{ path: "src/index.ts", content: indexTs(opts) },
		{ path: "src/commands/ping.ts", content: pingCommandTs(opts) },
		{ path: "README.md", content: readme(opts) },
	];
	const storage = storageTs(opts.adapter);
	if (storage) files.push({ path: "src/storage.ts", content: storage });
	if (opts.adapter === "drizzle") files.push({ path: "src/db/schema.ts", content: drizzleSchemaTs() });
	if (opts.adapter === "mongoose") files.push({ path: "src/db/models.ts", content: mongooseModelsTs() });
	if (opts.adapter === "prisma") files.push({ path: "prisma/schema.prisma", content: prismaSchema() });
	return files;
}

export function installCommand(pm: PackageManager): { cmd: string; args: string[] } {
	if (pm === "bun") return { cmd: "bun", args: ["install"] };
	if (pm === "pnpm") return { cmd: "pnpm", args: ["install"] };
	return { cmd: "npm", args: ["install"] };
}
