/** Storage adapter choice for generated projects. `none` scaffolds an in-memory-only bot. */
export type Adapter = "drizzle" | "prisma" | "mongoose" | "none";

/** Package manager used for generated install and scripts. */
export type PackageManager = "bun" | "pnpm" | "npm";

/** Fully resolved scaffold options used by the wizard and non-interactive flags. */
export interface ScaffoldOptions {
	/** Directory/package name for the generated bot. */
	projectName: string;
	/** Storage adapter template to include. */
	adapter: Adapter;
	/** Whether to enable legacy prefix commands. */
	legacy: boolean;
	/** Whether to add `@djs-commands/jsx` and Components V2 examples. */
	componentsV2: boolean;
	/** Package manager for install commands and generated scripts. */
	packageManager: PackageManager;
	/** Whether to initialize a git repository in the generated project. */
	initGit: boolean;
}

/** Partial options parsed from CLI flags before interactive prompts fill defaults. */
export interface ParsedFlags extends Partial<ScaffoldOptions> {
	/** Show CLI help and exit. */
	help?: boolean;
	/** Skip dependency installation after files are written. */
	skipInstall?: boolean;
}

/** Parses `create-djs-commands` CLI flags without prompting. */
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

/** Help text printed by `create-djs-commands --help`. */
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
