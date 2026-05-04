import type { Adapter, PackageManager, ScaffoldOptions } from "./options";

interface FileContent {
	path: string;
	content: string;
}

const DEPS = {
	core: "^0.0.0",
	jsx: "^0.0.0",
	adapterDrizzle: "^0.0.0",
	adapterPrisma: "^0.0.0",
	adapterMongoose: "^0.0.0",
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

	let storageSetup = "";
	let storageOption = "";
	if (opts.adapter === "drizzle") {
		imports.push(`import { drizzleStorage } from "@djs-commands/adapter-drizzle";`, `import { drizzle } from "drizzle-orm/node-postgres";`, `import pg from "pg";`);
		storageSetup = `
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
`;
		storageOption = "\n\tstorage: drizzleStorage(db),";
	} else if (opts.adapter === "prisma") {
		imports.push(`import { prismaStorage } from "@djs-commands/adapter-prisma";`, `import { PrismaClient } from "@prisma/client";`);
		storageSetup = `
const prisma = new PrismaClient();
`;
		storageOption = "\n\tstorage: prismaStorage(prisma),";
	} else if (opts.adapter === "mongoose") {
		imports.push(`import { mongooseStorage } from "@djs-commands/adapter-mongoose";`, `import mongoose from "mongoose";`);
		storageSetup = `
const connection = mongoose.createConnection(process.env.MONGO_URL!);
`;
		storageOption = "\n\tstorage: mongooseStorage(connection),";
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
	return [
		{ path: "package.json", content: packageJson(opts) },
		{ path: "tsconfig.json", content: tsconfigJson() },
		{ path: ".gitignore", content: gitignore() },
		{ path: ".env.example", content: envExample(opts.adapter) },
		{ path: "src/index.ts", content: indexTs(opts) },
		{ path: "src/commands/ping.ts", content: pingCommandTs(opts) },
		{ path: "README.md", content: readme(opts) },
	];
}

export function installCommand(pm: PackageManager): { cmd: string; args: string[] } {
	if (pm === "bun") return { cmd: "bun", args: ["install"] };
	if (pm === "pnpm") return { cmd: "pnpm", args: ["install"] };
	return { cmd: "npm", args: ["install"] };
}
