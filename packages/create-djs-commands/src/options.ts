export type Adapter = "drizzle" | "prisma" | "mongoose" | "none";
export type PackageManager = "bun" | "pnpm" | "npm";

export interface ScaffoldOptions {
	projectName: string;
	adapter: Adapter;
	legacy: boolean;
	componentsV2: boolean;
	packageManager: PackageManager;
	initGit: boolean;
}

export interface ParsedFlags extends Partial<ScaffoldOptions> {
	help?: boolean;
	skipInstall?: boolean;
}

export function parseFlags(argv: readonly string[]): ParsedFlags & { positional: string[] } {
	const flags: ParsedFlags & { positional: string[] } = { positional: [] };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg) continue;
		if (arg === "--help" || arg === "-h") {
			flags.help = true;
		} else if (arg === "--legacy") {
			flags.legacy = true;
		} else if (arg === "--components-v2") {
			flags.componentsV2 = true;
		} else if (arg === "--no-git") {
			flags.initGit = false;
		} else if (arg === "--skip-install") {
			flags.skipInstall = true;
		} else if (arg === "--adapter") {
			const value = argv[++i] as Adapter | undefined;
			if (value && ["drizzle", "prisma", "mongoose", "none"].includes(value)) {
				flags.adapter = value;
			}
		} else if (arg.startsWith("--adapter=")) {
			const value = arg.slice("--adapter=".length) as Adapter;
			if (["drizzle", "prisma", "mongoose", "none"].includes(value)) flags.adapter = value;
		} else if (arg === "--package-manager" || arg === "--pm") {
			const value = argv[++i] as PackageManager | undefined;
			if (value && ["bun", "pnpm", "npm"].includes(value)) flags.packageManager = value;
		} else if (arg.startsWith("--package-manager=") || arg.startsWith("--pm=")) {
			const value = arg.split("=")[1] as PackageManager;
			if (["bun", "pnpm", "npm"].includes(value)) flags.packageManager = value;
		} else if (!arg.startsWith("-")) {
			flags.positional.push(arg);
		}
	}
	return flags;
}

export const HELP_TEXT = `
create-djs-commands — scaffold a new Discord.js bot using @djs-commands

Usage:
  npx create-djs-commands [project-name] [flags]

Flags:
  --adapter <drizzle|prisma|mongoose|none>   Persistent storage adapter
  --legacy                                   Enable legacy prefix mode (e.g. !ping)
  --components-v2                            Add @djs-commands/jsx for Components V2
  --package-manager <bun|pnpm|npm>           Package manager (default: bun)
  --no-git                                   Don't initialize a git repository
  --skip-install                             Don't run dependency install
  -h, --help                                 Show this message

Run with no arguments for an interactive wizard.
`;
