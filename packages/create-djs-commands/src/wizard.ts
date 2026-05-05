import { cancel, confirm, intro, isCancel, outro, select, text } from "@clack/prompts";
import pico from "picocolors";
import type { Adapter, PackageManager, ParsedFlags, ScaffoldOptions } from "./options";

function exitOnCancel<T>(value: T | symbol): T {
	if (isCancel(value)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return value as T;
}

export async function runWizard(flags: ParsedFlags & { positional: string[] }): Promise<ScaffoldOptions> {
	intro(pico.bgCyan(pico.black(" create-djs-commands ")));

	const projectName =
		flags.projectName ??
		flags.positional[0] ??
		exitOnCancel(
			await text({
				message: "Project name",
				placeholder: "my-bot",
				defaultValue: "my-bot",
				validate: (value) => {
					if (value.length === 0) return "Project name is required";
					if (!/^[a-z0-9][a-z0-9-_]*$/i.test(value)) return "Use letters, numbers, hyphens, or underscores";
					return undefined;
				},
			})
		);

	const adapter =
		flags.adapter ??
		exitOnCancel(
			await select<Adapter>({
				message: "Persistent storage adapter",
				options: [
					{ value: "drizzle", label: "Drizzle (Postgres)" },
					{ value: "prisma", label: "Prisma" },
					{ value: "mongoose", label: "Mongoose (MongoDB)" },
					{ value: "none", label: "None — in-memory only" },
				],
				initialValue: "drizzle",
			})
		);

	const legacy =
		flags.legacy ??
		exitOnCancel(
			await confirm({
				message: "Enable legacy prefix mode (e.g. !ping)?",
				initialValue: false,
			})
		);

	const componentsV2 =
		flags.componentsV2 ??
		exitOnCancel(
			await confirm({
				message: "Add @djs-commands/jsx for Components V2?",
				initialValue: false,
			})
		);

	const packageManager =
		flags.packageManager ??
		exitOnCancel(
			await select<PackageManager>({
				message: "Package manager",
				options: [
					{ value: "bun", label: "bun" },
					{ value: "pnpm", label: "pnpm" },
					{ value: "npm", label: "npm" },
				],
				initialValue: "bun",
			})
		);

	const initGit =
		flags.initGit ??
		exitOnCancel(
			await confirm({
				message: "Initialize a git repository?",
				initialValue: true,
			})
		);

	outro(pico.green("Scaffolding…"));

	return { projectName, adapter, legacy, componentsV2, packageManager, initGit };
}
